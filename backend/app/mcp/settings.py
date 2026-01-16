from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_PATH = Path(__file__).resolve().parents[2] / '.env'


class MCPSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding='utf-8',
        extra='ignore'
    )

    api_base_url: str = Field(
        default='http://localhost:8000',
        validation_alias='SNAPCHARGE_API_BASE_URL'
    )
    web_base_url: str = Field(
        default='http://localhost:5173',
        validation_alias='SNAPCHARGE_WEB_BASE_URL'
    )
    access_token: str | None = Field(
        default=None,
        validation_alias='SNAPCHARGE_ACCESS_TOKEN'
    )
    mcp_transport: str = Field(
        default='stdio',
        validation_alias='SNAPCHARGE_MCP_TRANSPORT'
    )
    mcp_host: str = Field(
        default='127.0.0.1',
        validation_alias='SNAPCHARGE_MCP_HOST'
    )
    mcp_port: int = Field(
        default=9000,
        validation_alias='SNAPCHARGE_MCP_PORT'
    )
    request_timeout_seconds: int = Field(
        default=20,
        validation_alias='SNAPCHARGE_REQUEST_TIMEOUT_SECONDS'
    )
    mcp_use_asgi_app: bool = Field(
        default=False,
        validation_alias='SNAPCHARGE_MCP_USE_ASGI_APP'
    )


@lru_cache
def get_mcp_settings() -> MCPSettings:
    return MCPSettings()
