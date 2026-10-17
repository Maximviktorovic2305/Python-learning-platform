"""Executable dependency rules for the modular monolith; no database required."""

import ast
import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from starlette.requests import Request

from app import bootstrap
from app.api.dependencies import get_runner
from app.core.config import get_settings
from app.infrastructure.execution import RemoteRunner

ROOT = Path(__file__).parents[1] / "app"


def imports(tree: ast.AST) -> set[str]:
    result = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            result.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            result.add(node.module)
            result.update(f"{node.module}.{alias.name}" for alias in node.names)
    return result


@pytest.mark.parametrize(
    ("layer", "forbidden"),
    [
        (
            "domain",
            (
                "fastapi",
                "httpx",
                "sqlalchemy",
                "pydantic",
                "app.api",
                "app.services",
                "app.repositories",
                "app.infrastructure",
                "app.core",
                "app.models",
                "app.schemas",
                "app.ports",
            ),
        ),
        (
            "ports",
            (
                "fastapi",
                "httpx",
                "sqlalchemy",
                "app.api",
                "app.services",
                "app.repositories",
                "app.infrastructure",
                "app.core",
                "app.models",
            ),
        ),
        (
            "services",
            ("fastapi", "httpx", "app.api", "app.infrastructure", "app.bootstrap", "app.main"),
        ),
        (
            "repositories",
            (
                "fastapi",
                "httpx",
                "app.api",
                "app.services",
                "app.infrastructure",
                "app.bootstrap",
                "app.main",
            ),
        ),
        ("infrastructure", ("fastapi", "app.api", "app.services", "app.bootstrap", "app.main")),
        (
            "api/routers",
            (
                "sqlalchemy",
                "app.models",
                "app.repositories",
                "app.infrastructure",
                "app.core.security",
            ),
        ),
    ],
)
def test_dependency_direction(layer, forbidden):
    for file in (ROOT / layer).rglob("*.py"):
        dependencies = imports(ast.parse(file.read_text(encoding="utf-8")))
        invalid = {
            name
            for name in dependencies
            if any(name == prefix or name.startswith(prefix + ".") for prefix in forbidden)
        }
        assert not invalid, f"{file.relative_to(ROOT)} imports {invalid}"


def test_services_do_not_construct_queries_or_manage_transaction_boundaries():
    for file in (ROOT / "services").glob("*.py"):
        for node in ast.walk(ast.parse(file.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    assert node.func.id not in {"select", "update", "delete", "insert", "text"}, (
                        file
                    )
                if (
                    isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "session"
                ):
                    assert node.func.attr in {"add", "flush"}, (file, node.lineno, node.func.attr)


def test_application_imports_have_no_cycles():
    files = {}
    for file in ROOT.rglob("*.py"):
        parts = list(file.relative_to(ROOT).with_suffix("").parts)
        if parts[-1] == "__init__":
            parts.pop()
        files[".".join(["app", *parts])] = file
    edges = {
        name: imports(ast.parse(file.read_text(encoding="utf-8"))) & files.keys()
        for name, file in files.items()
    }
    visited = set()

    def visit(name, path):
        assert name not in path, " -> ".join([*path, name])
        if name in visited:
            return
        for dependency in edges[name]:
            visit(dependency, [*path, name])
        visited.add(name)

    for name in edges:
        visit(name, [])


def test_openapi_contract_matches_versioned_contract():
    assert bootstrap.create_app().openapi() == json.loads(
        (ROOT.parent / "openapi.json").read_text(encoding="utf-8")
    )


async def test_lifespan_owns_runner_http_pool_and_disposes_database(monkeypatch):
    settings = get_settings().model_copy(update={"execution_runner": "remote"})
    monkeypatch.setattr(bootstrap, "get_settings", lambda: settings)
    dispose = AsyncMock()
    monkeypatch.setattr(bootstrap, "engine", SimpleNamespace(dispose=dispose))
    app = bootstrap.create_app()
    async with app.router.lifespan_context(app):
        runner = app.state.execution_runner
        assert isinstance(runner, RemoteRunner)
        assert not runner.client.is_closed
        assert runner.client.timeout.connect == 5
        assert runner.client.timeout.read == 150
        assert get_runner(Request({"type": "http", "app": app, "headers": []})) is runner
    assert runner.client.is_closed
    assert not hasattr(app.state, "execution_runner")
    dispose.assert_awaited_once()


async def test_lifespan_releases_resources_on_failure(monkeypatch):
    monkeypatch.setattr(
        bootstrap,
        "get_settings",
        lambda: get_settings().model_copy(update={"execution_runner": "remote"}),
    )
    dispose = AsyncMock()
    monkeypatch.setattr(bootstrap, "engine", SimpleNamespace(dispose=dispose))
    app = bootstrap.create_app()
    with pytest.raises(RuntimeError, match="shutdown"):
        async with app.router.lifespan_context(app):
            runner = app.state.execution_runner
            raise RuntimeError("shutdown")
    assert runner.client.is_closed
    assert not hasattr(app.state, "execution_runner")
    dispose.assert_awaited_once()


async def test_limiters_are_per_app_and_production_relies_on_edge(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(
        bootstrap, "get_settings", lambda: settings.model_copy(update={"environment": "test"})
    )
    first, second = bootstrap.create_app(), bootstrap.create_app()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=first), base_url="http://localhost"
    ) as client:
        responses = [await client.post("/api/auth/missing") for _ in range(31)]
    assert responses[-1].status_code == 429
    assert responses[-1].headers["cache-control"] == "no-store"
    assert responses[-1].headers["x-content-type-options"] == "nosniff"
    assert responses[-1].headers["retry-after"] == "60"
    assert second.state.auth_limiter.allow("127.0.0.1")
    monkeypatch.setattr(
        bootstrap, "get_settings", lambda: settings.model_copy(update={"environment": "production"})
    )
    production = bootstrap.create_app()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=production), base_url="http://localhost"
    ) as client:
        responses = [await client.post("/api/auth/missing") for _ in range(35)]
        assert all(response.status_code == 404 for response in responses)
        assert (await client.get("/docs")).status_code == 404
    assert not production.state.auth_limiter.requests
