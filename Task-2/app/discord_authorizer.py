from __future__ import annotations

import logging
import time
from typing import Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_TIMESTAMP_TOLERANCE_SECONDS = 300


def handler(event: dict, context: Any) -> dict:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}

    sig       = headers.get("x-signature-ed25519", "")
    timestamp = headers.get("x-signature-timestamp", "")

    if not sig or not timestamp:
        logger.warning("Missing Discord signature headers")
        return {"isAuthorized": False}

    try:
        if abs(time.time() - float(timestamp)) > _TIMESTAMP_TOLERANCE_SECONDS:
            logger.warning("Stale Discord timestamp: %s", timestamp)
            return {"isAuthorized": False}
    except ValueError:
        logger.warning("Invalid Discord timestamp: %s", timestamp)
        return {"isAuthorized": False}

    return {"isAuthorized": True}
