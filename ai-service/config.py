from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent


def load_environment_files() -> None:
    """
    Load the base .env file first, then optionally override values from an
    environment-specific file such as .env.dev, .env.staging, or .env.prod.
    """
    load_dotenv(BASE_DIR / ".env")

    environment = os.getenv("ENVIRONMENT", "dev").strip().lower()
    environment_file = BASE_DIR / f".env.{environment}"
    if environment_file.exists():
        load_dotenv(environment_file, override=True)


def _parse_int(value: str, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


load_environment_files()


@dataclass(frozen=True)
class Config:
    groq_api_key: str
    ai_provider: str
    ai_timeout: int
    ai_max_retries: int
    environment: str

    @classmethod
    def load(cls) -> "Config":
        environment = os.getenv("ENVIRONMENT", "dev").strip().lower()

        return cls(
            groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
            ai_provider=os.getenv("AI_PROVIDER", "groq").strip().lower(),
            ai_timeout=max(1, _parse_int(os.getenv("AI_TIMEOUT", "10"), 10)),
            ai_max_retries=max(0, _parse_int(os.getenv("AI_MAX_RETRIES", "3"), 3)),
            environment=environment,
        )

    @property
    def is_connected(self) -> bool:
        return self.ai_provider == "groq" and bool(self.groq_api_key)

    def masked_api_key(self) -> str:
        if not self.groq_api_key:
            return ""

        if len(self.groq_api_key) <= 8:
            return "***MASKED***"

        return f"{self.groq_api_key[:4]}***{self.groq_api_key[-4:]}"

    def validate_provider(self) -> None:
        if self.ai_provider != "groq":
            raise ValueError(
                f"Unsupported AI_PROVIDER '{self.ai_provider}'. Only 'groq' is enabled."
            )

    @staticmethod
    def secret_manager_hint() -> str:
        return "Configure a secret manager adapter here in the future if environment variables are replaced."


config = Config.load()
