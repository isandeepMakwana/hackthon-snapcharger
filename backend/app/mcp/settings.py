from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class McpSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        env_prefix='SNAPCHARGE_',
        extra='ignore'
    )

    api_base_url: str = 'http://localhost:8000'
    web_base_url: str = 'http://localhost:5173'
    access_token: str | None = None

    mcp_transport: Literal['stdio', 'sse', 'streamable-http'] = 'stdio'
    mcp_host: str = '127.0.0.1'
    mcp_port: int = 9000
    request_timeout_seconds: int = 20
    mcp_use_asgi_app: bool = False


def get_mcp_settings() -> McpSettings:
    return McpSettings()
