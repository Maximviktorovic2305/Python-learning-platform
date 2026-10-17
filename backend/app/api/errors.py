from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.domain.errors import (
    ApplicationError,
    AuthenticationRequired,
    Conflict,
    DependencyUnavailable,
    InvalidRequest,
    PermissionDenied,
    ResourceNotFound,
    UnprocessableInput,
)

STATUS_CODES: dict[type[Exception], int] = {
    AuthenticationRequired: 401,
    ResourceNotFound: 404,
    PermissionDenied: 403,
    InvalidRequest: 400,
    UnprocessableInput: 422,
    Conflict: 409,
    DependencyUnavailable: 503,
}


async def application_error(request: Request, error: Exception) -> JSONResponse:
    status = STATUS_CODES.get(type(error), 500)
    return JSONResponse(
        {"detail": str(error) if status != 500 else "Внутренняя ошибка сервера"},
        status_code=status,
        headers={"WWW-Authenticate": "Bearer"} if status == 401 else None,
    )


async def conflict(request: Request, error: Exception) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": "Email, имя или запись уже существуют"})


async def invalid_request(request: Request, error: Exception) -> JSONResponse:
    assert isinstance(error, RequestValidationError)
    # Do not expose Pydantic input/ctx: these can contain credentials.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [{"loc": issue["loc"], "type": issue["type"]} for issue in error.errors()]
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApplicationError, application_error)
    app.add_exception_handler(IntegrityError, conflict)
    app.add_exception_handler(RequestValidationError, invalid_request)
