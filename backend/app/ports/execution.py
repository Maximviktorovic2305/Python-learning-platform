from typing import Protocol

from pydantic import BaseModel

from app.schemas.contracts import ExecutionResult


class TestCase(BaseModel):
    stdin: str
    expected_stdout: str


class ExecutionRequest(BaseModel):
    code: str
    tests: list[TestCase]


class ExecutionRunner(Protocol):
    async def execute(self, request: ExecutionRequest) -> ExecutionResult: ...
