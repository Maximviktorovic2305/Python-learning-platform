from fastapi import Response

from app.core.config import get_settings


def set_refresh(response: Response, token: str) -> None:
    response.set_cookie(
        "refresh",
        token,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="strict",
        max_age=30 * 86400,
        path="/api/auth",
    )
    response.headers["Cache-Control"] = "no-store"


def clear_refresh(response: Response) -> None:
    response.delete_cookie(
        "refresh",
        path="/api/auth",
        secure=get_settings().cookie_secure,
        httponly=True,
        samesite="strict",
    )
    response.headers["Cache-Control"] = "no-store"
