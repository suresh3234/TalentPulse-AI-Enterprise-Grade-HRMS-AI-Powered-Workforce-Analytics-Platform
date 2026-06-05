from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

DEFAULT_GLOBAL_RATE_LIMIT = "60/minute"
DEFAULT_AI_RATE_LIMIT = "10/minute"

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[DEFAULT_GLOBAL_RATE_LIMIT],
)
