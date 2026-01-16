from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    app_name: str = 'SnapCharge API'
    port: int = 8000
    database_url: str = Field(default='sqlite:///./snapcharge.db')

    jwt_secret_key: str = Field(min_length=32)
    jwt_refresh_secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = 1440  # 24 hours (1 day)
    refresh_token_expire_days: int = 30
    bcrypt_rounds: int = 12

    app_base_url: str = 'http://localhost:8000'
    cors_origins: str = 'http://localhost:5173'

    rate_limit_window_seconds: int = 900
    rate_limit_login_max: int = 8
    rate_limit_register_max: int = 5
    rate_limit_reset_max: int = 5

    seed_demo_data: bool = False

    # Google API
    google_api_key: str = Field(default='')

    # AWS S3
    aws_access_key_id: str = Field(default='')
    aws_secret_access_key: str = Field(default='')
    aws_region: str = Field(default='us-east-1')
    aws_bucket_name: str = Field(default='')


def get_settings() -> Settings:
    return Settings()
