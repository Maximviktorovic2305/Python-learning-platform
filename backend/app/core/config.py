from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+asyncpg://python@127.0.0.1:55432/python_lab"
    jwt_secret: str = Field(min_length=32)
    environment: Literal["development", "test", "production"] = "development"
    cookie_secure: bool = False
    allowed_origin: str = "http://localhost:3010"
    execution_runner: Literal["disabled", "remote"] = "disabled"
    runner_url: str = "http://runner:8090"
    runner_token: str = ""

    @model_validator(mode="after")
    def production_configuration(self) -> "Settings":
        if self.environment == "production":
            if not self.cookie_secure or not self.allowed_origin.startswith("https://"):
                raise ValueError("Production requires secure cookies and an HTTPS origin")
            if self.execution_runner == "remote" and len(self.runner_token) < 32:
                raise ValueError("Runner authentication requires a strong secret")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
