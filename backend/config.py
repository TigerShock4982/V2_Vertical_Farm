import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings from environment variables"""

    database_url: str = "sqlite:///farm.db"
    debug: bool = True
    cors_origins: list[str] = ["*"]
    alert_cooldown_seconds: int = 10
    mock_sensor_enabled: bool = True
    mock_sensor_interval: float = 2.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
