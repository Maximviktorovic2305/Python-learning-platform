import logging
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from urllib.parse import urlsplit

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import Response

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
app = FastAPI(
    title="Python Lab",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    openapi_url="/openapi.json" if settings.environment != "production" else None,
)
if settings.environment == "production":
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

# Per-process development limiter; production reverse proxy must enforce distributed limits.
requests_by_ip: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def guard_requests(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    if request.method != "GET" and request.url.path.startswith("/api/auth"):
        key = client
        if key not in requests_by_ip and len(requests_by_ip) >= 10000:
            del requests_by_ip[next(iter(requests_by_ip))]
        recent = requests_by_ip[key]
        while recent and recent[0] < now - 60:
            recent.popleft()
        if len(recent) >= 30:
            return JSONResponse(
                {"detail": "Слишком много запросов, повторите через минуту"},
                status_code=429,
                headers={"Retry-After": "60"},
            )
        recent.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(IntegrityError)
async def conflict(request: Request, error: IntegrityError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": "Email, имя или запись уже существуют"})
