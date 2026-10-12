from typing import Protocol

import httpx
from fastapi import HTTPException
from pydantic import BaseModel

from app.core.config import get_settings
from app.schemas.contracts import ExecutionResult


class TestCase(BaseModel):
    stdin: str
    expected_stdout: str


class ExecutionRequest(BaseModel):
    code: str
    tests: list[TestCase]


class ExecutionRunner(Protocol):
    async def execute(self, request: ExecutionRequest) -> ExecutionResult: ...


class DisabledRunner:
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        raise HTTPException(503, "Серверная проверка недоступна: изолированный runner не запущен. Локальный запуск в браузере доступен без выдачи XP.")


class RemoteRunner:
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        settings = get_settings()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(f"{settings.runner_url}/execute", json=request.model_dump(),
                                             headers={"Authorization": f"Bearer {settings.runner_token}"})
                response.raise_for_status()
                return ExecutionResult.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as error:
            raise HTTPException(503, "Runner временно недоступен") from error


def get_runner() -> ExecutionRunner:
    return RemoteRunner() if get_settings().execution_runner == "remote" else DisabledRunner()
