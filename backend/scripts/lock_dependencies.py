"""Freeze only the installed dependency closure; run after an intentional dependency upgrade."""

import tomllib
from importlib.metadata import distribution
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name


def collect(roots: list[str]) -> dict[str, str]:
    versions: dict[str, str] = {}
    visited: set[tuple[str, str]] = set()
    pending = [Requirement(root) for root in roots]
    while pending:
        requirement = pending.pop()
        name = canonicalize_name(requirement.name)
        package = distribution(name)
        if package.version not in requirement.specifier:
            raise ValueError(f"Installed {name} {package.version} violates {requirement}")
        versions[name] = package.version
        for extra in requirement.extras | {""}:
            if (name, extra) in visited:
                continue
            visited.add((name, extra))
            for value in package.requires or []:
                dependency = Requirement(value)
                if dependency.marker is None or dependency.marker.evaluate({"extra": extra}):
                    pending.append(dependency)
    return versions


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    config = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
    runtime = collect(config["project"]["dependencies"])
    development = collect(config["dependency-groups"]["dev"])
    for filename, dependencies, prefix in (
        ("requirements.lock", runtime, ""),
        (
            "requirements-dev.lock",
            {k: v for k, v in development.items() if k not in runtime},
            "-r requirements.lock\n",
        ),
    ):
        (root / filename).write_text(
            prefix
            + "".join(f"{name}=={version}\n" for name, version in sorted(dependencies.items())),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
