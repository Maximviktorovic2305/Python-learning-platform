import json

import httpx
import pytest

from app.domain.errors import DependencyUnavailable
from app.infrastructure.execution import DisabledRunner, RemoteRunner
from app.ports.execution import ExecutionRequest
from app.ports.execution import TestCase as RunnerCase

REQUEST = ExecutionRequest(
    code="print(input())", tests=[RunnerCase(stdin="ok\n", expected_stdout="ok")]
)


async def test_remote_runner_uses_injected_client_and_authenticated_protocol():
    def handle(request):
        assert str(request.url) == "http://runner:8090/execute"
        assert request.headers["authorization"] == "Bearer test-secret"
        assert json.loads(request.content) == REQUEST.model_dump()
        return httpx.Response(
            200, json={"status": "passed", "passed": 1, "total": 1, "stdout": "ok", "stderr": ""}
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        runner = RemoteRunner(client, "http://runner:8090", "test-secret")
        result = await runner.execute(REQUEST)
        assert result.status == "passed" and result.xp == 0
        assert not client.is_closed


@pytest.mark.parametrize("failure", ["timeout", "connection", "status", "json", "contract"])
async def test_dependency_failures_are_application_errors(failure):
    def handle(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("private upstream details", request=request)
        if failure == "connection":
            raise httpx.ConnectError("private upstream details", request=request)
        if failure == "status":
            return httpx.Response(503, text="private upstream details")
        if failure == "json":
            return httpx.Response(200, text="not json")
        return httpx.Response(200, json={"status": "unexpected"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
        with pytest.raises(DependencyUnavailable) as error:
            await RemoteRunner(client, "http://runner:8090", "test-secret").execute(REQUEST)
        assert str(error.value) == "Runner временно недоступен"


async def test_disabled_runner_cannot_execute_or_award():
    with pytest.raises(DependencyUnavailable):
        await DisabledRunner().execute(REQUEST)
