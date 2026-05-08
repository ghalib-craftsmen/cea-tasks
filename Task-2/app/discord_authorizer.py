from __future__ import annotations

import base64
import binascii
import logging
import os
import time
from typing import Any

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_TIMESTAMP_TOLERANCE_SECONDS = 300
_PUBLIC_KEY = os.environ.get("DISCORD_PUBLIC_KEY", "")


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

    body_str: str = event.get("body", "") or ""
    try:
        raw_body = base64.b64decode(body_str) if event.get("isBase64Encoded") else body_str.encode()
    except binascii.Error:
        logger.warning("Body base64 decode failed in authorizer")
        return {"isAuthorized": False}

    try:
        verify_key = VerifyKey(bytes.fromhex(_PUBLIC_KEY))
        verify_key.verify(timestamp.encode() + raw_body, bytes.fromhex(sig))
    except (BadSignatureError, ValueError) as exc:
        logger.warning("Ed25519 signature verification failed: %s", exc)
        return {"isAuthorized": False}

    return {"isAuthorized": True}
