import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.errors import register_error_handlers
from app.api.middleware import register_request_guard
from app.api.routes import router
from app.core.config import get_settings
from app.core.database import engine
from app.infrastructure.execution import DisabledRunner, RemoteRunner


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient(timeout=httpx.Timeout(150, connect=5, pool=5)) as client:
            application.state.execution_runner = (
                RemoteRunner(client, settings.runner_url, settings.runner_token)
                if settings.execution_runner == "remote"
                else DisabledRunner()
            )
            try:
                yield
            finally:
                del application.state.execution_runner
                await engine.dispose()

    production = settings.environment == "production"
    app = FastAPI(
        title="Python Lab",
        version="1.0.0",
        docs_url=None if production else "/docs",
        redoc_url=None if production else "/redoc",
        openapi_url=None if production else "/openapi.json",
        lifespan=lifespan,
    )
    if production:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=[
                urlsplit(settings.allowed_origin).hostname or "localhost",
                "backend",
                "localhost",
                "127.0.0.1",
            ],
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.allowed_origin],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(router)
    register_error_handlers(app)
    register_request_guard(app, production=production)
    return app
