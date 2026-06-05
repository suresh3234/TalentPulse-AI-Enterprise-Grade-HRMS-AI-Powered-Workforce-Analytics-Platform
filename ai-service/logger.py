from __future__ import annotations

import json
import logging
from typing import Any


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record: dict[str, Any] = {
            "service": "ai-service",
            "time": self.formatTime(record, self.datefmt),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
        }

        for field_name in ("request_id", "endpoint", "latency_ms", "status"):
            if hasattr(record, field_name):
                log_record[field_name] = getattr(record, field_name)

        return json.dumps(log_record, default=str)


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("ai_service")

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    logger.propagate = False

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)

    return logger


def log_event(
    message: str,
    *,
    request_id: str | None = None,
    endpoint: str | None = None,
    latency_ms: int | None = None,
    status: str | None = None,
    level: int = logging.INFO,
) -> None:
    extra: dict[str, Any] = {}
    if request_id is not None:
        extra["request_id"] = request_id
    if endpoint is not None:
        extra["endpoint"] = endpoint
    if latency_ms is not None:
        extra["latency_ms"] = latency_ms
    if status is not None:
        extra["status"] = status

    logger.log(level, message, extra=extra)


logger = setup_logger()
