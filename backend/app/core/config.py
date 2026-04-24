from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), str(PROJECT_ROOT / ".env")),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "EduHub"
    debug: bool = False
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h
    expose_api_docs: bool | None = None
    cors_origins: list[str] = []
    cors_origin_regex: str | None = None

    database_url: str = "postgresql://eduhub:eduhub@localhost:5433/eduhub"
    db_bootstrap_on_startup: bool = False
    db_run_legacy_migrations: bool = False
    database_ssl_mode: str | None = None
    database_connect_timeout: int = 10
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 50

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod"}:
                return False
            if normalized in {"debug", "development", "dev"}:
                return True
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: Any):
        if value is None:
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if str(item).strip()]
        return value

    @staticmethod
    def _is_local_database_host(url: str) -> bool:
        hostname = urlsplit(url).hostname or ""
        return hostname in {"", "localhost", "127.0.0.1", "::1"}

    @property
    def normalized_database_url(self) -> str:
        url = self.database_url
        if not url.startswith(("postgresql://", "postgres://")):
            return url

        parts = urlsplit(url)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))

        ssl_mode = self.database_ssl_mode
        if ssl_mode is None and not self._is_local_database_host(url):
            ssl_mode = "require"

        if ssl_mode and "sslmode" not in query:
            query["sslmode"] = ssl_mode

        if self.database_connect_timeout and "connect_timeout" not in query:
            query["connect_timeout"] = str(self.database_connect_timeout)

        return urlunsplit(parts._replace(query=urlencode(query)))

    @property
    def database_connect_args(self) -> dict[str, object]:
        if self.normalized_database_url.startswith("sqlite"):
            return {"check_same_thread": False}
        return {}

    @property
    def api_docs_enabled(self) -> bool:
        if self.expose_api_docs is None:
            return self.debug
        return self.expose_api_docs


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
