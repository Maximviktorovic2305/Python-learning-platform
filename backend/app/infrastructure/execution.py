import httpx

from app.domain.errors import DependencyUnavailable
from app.ports.execution import ExecutionRequest
from app.schemas.contracts import ExecutionResult


class DisabledRunner:
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        raise DependencyUnavailable(
            "Серверная проверка недоступна: изолированный runner не запущен. Локальный запуск в браузере доступен без выдачи XP."
        )


class RemoteRunner:
    def __init__(self, client: httpx.AsyncClient, url: str, token: str) -> None:
        self.client, self.url, self.token = client, url, token

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        try:
            response = await self.client.post(
                f"{self.url}/execute",
                json=request.model_dump(),
                headers={"Authorization": f"Bearer {self.token}"},
            )
            response.raise_for_status()
            return ExecutionResult.model_validate(response.json())
        except (httpx.HTTPError, ValueError) as error:
            raise DependencyUnavailable("Runner временно недоступен") from error
