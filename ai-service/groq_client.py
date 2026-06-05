from __future__ import annotations

import logging

from groq import APIConnectionError, APITimeoutError, Groq, RateLimitError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from config import config
from logger import log_event

DEFAULT_MODEL = "llama-3.1-8b-instant"


class GroqClientError(RuntimeError):
    """Base exception for AI provider connection failures."""


class GroqConfigurationError(GroqClientError):
    """Raised when the Groq connector is not configured correctly."""


class GroqResponseError(GroqClientError):
    """Raised when the Groq API returns an unusable response."""


class GroqClient:
    def __init__(self) -> None:
        config.validate_provider()
        self._config = config
        self._client: Groq | None = None

    def _get_client(self) -> Groq:
        if self._client is not None:
            return self._client

        if not self._config.groq_api_key:
            raise GroqConfigurationError("GROQ_API_KEY is not configured.")

        self._client = Groq(
            api_key=self._config.groq_api_key,
            timeout=self._config.ai_timeout,
            max_retries=0,
        )
        return self._client

    @retry(
        retry=retry_if_exception_type(
            (APIConnectionError, APITimeoutError, RateLimitError)
        ),
        stop=stop_after_attempt(config.ai_max_retries + 1),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    def _send_request(self, messages: list[dict[str, str]], model: str) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=model,
            messages=messages,
        )

        if not response.choices:
            raise GroqResponseError("Groq response did not include any choices.")

        first_choice = response.choices[0]
        message = getattr(first_choice, "message", None)
        content = getattr(message, "content", None)

        if not content:
            raise GroqResponseError("Groq response did not contain message content.")

        return content

    def send_prompt(self, prompt: str, model: str = DEFAULT_MODEL) -> str:
        if not prompt or not prompt.strip():
            raise GroqClientError("Prompt cannot be empty.")

        messages = [{"role": "user", "content": prompt.strip()}]

        try:
            return self._send_request(messages=messages, model=model)
        except (APIConnectionError, APITimeoutError, RateLimitError) as exc:
            log_event(
                "Groq request failed",
                endpoint="groq_client.send_prompt",
                status="failure",
                level=logging.ERROR,
            )
            raise GroqClientError("AI service temporarily unavailable") from exc
        except GroqClientError:
            raise
        except Exception as exc:
            log_event(
                "Unexpected Groq client error",
                endpoint="groq_client.send_prompt",
                status="failure",
                level=logging.ERROR,
            )
            raise GroqClientError("AI service temporarily unavailable") from exc

    def is_ready(self) -> bool:
        return bool(self._config.groq_api_key)


groq_client = GroqClient()
