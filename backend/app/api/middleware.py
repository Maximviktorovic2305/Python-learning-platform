import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.responses import Response


class AuthRateLimiter:
    """Bounded, per-application development limiter. Production uses the edge proxy."""

    def __init__(self) -> None:
        self.requests: dict[str, deque[float]] = defaultdict(deque)

    def clear(self) -> None:
        self.requests.clear()

    def allow(self, client: str) -> bool:
        now = time.monotonic()
        if client not in self.requests and len(self.requests) >= 10000:
            del self.requests[next(iter(self.requests))]
        recent = self.requests[client]
        while recent and recent[0] < now - 60:
            recent.popleft()
        if len(recent) >= 30:
            return False
        recent.append(now)
        return True


def register_request_guard(app: FastAPI, *, production: bool) -> None:
    limiter = AuthRateLimiter()
    app.state.auth_limiter = limiter

    @app.middleware("http")
    async def guard_requests(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        client = request.client.host if request.client else "unknown"
        if (
            not production
            and request.method != "GET"
            and request.url.path.startswith("/api/auth")
            and not limiter.allow(client)
        ):
            response: Response = JSONResponse(
                {"detail": "Слишком много запросов, повторите через минуту"},
                status_code=429,
                headers={"Retry-After": "60"},
            )
        else:
            response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response
