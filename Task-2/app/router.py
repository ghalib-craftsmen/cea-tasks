from __future__ import annotations

import base64
import binascii
import json
import logging
import time
from typing import Any

import boto3
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from app.config import settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_PING = 1
_APPLICATION_COMMAND = 2
_PONG = 1
_DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5
_EPHEMERAL = 64

_lambda_client = boto3.client("lambda", region_name=settings.aws_region)


def _ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def _err(status: int, message: str) -> dict:
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": message})}


def _verify_signature(headers: dict, raw_body: bytes) -> bool:
    sig = headers.get("x-signature-ed25519", "")
    timestamp = headers.get("x-signature-timestamp", "")

    if not sig or not timestamp:
        return False

    try:
        if abs(time.time() - float(timestamp)) > 300:
            return False
    except ValueError:
        return False

    try:
        verify_key = VerifyKey(bytes.fromhex(settings.discord_public_key))
        verify_key.verify(timestamp.encode() + raw_body, bytes.fromhex(sig))
        return True
    except (BadSignatureError, ValueError):
        return False


def handler(event: dict, context: Any) -> dict:
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")

    if method == "GET" and path == "/health":
        return _ok({"status": "ok"})

    if method != "POST" or path != "/interactions":
        return _err(404, "Not found")

    body_str: str = event.get("body", "") or ""
    try:
        raw_body = base64.b64decode(body_str) if event.get("isBase64Encoded") else body_str.encode()
    except binascii.Error:
        return _err(400, "Invalid request body")
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}

    if not _verify_signature(headers, raw_body):
        logger.warning("Invalid signature")
        return _err(401, "Invalid request signature")

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.warning("Invalid JSON in request body")
        return _err(400, "Invalid request body")

    if payload.get("type") == _PING:
        return _ok({"type": _PONG})

    if payload.get("guild_id") != settings.authorized_guild_id:
        logger.warning("Unauthorized guild: %s", payload.get("guild_id"))
        return _err(401, "Unauthorized guild")

    if payload.get("type") != _APPLICATION_COMMAND:
        return _err(400, "Unsupported interaction type")

    try:
        _lambda_client.invoke(
            FunctionName=settings.command_lambda_name,
            InvocationType="Event",
            Payload=json.dumps(payload).encode(),
        )
        logger.info("Dispatched command=%s to %s", payload.get("data", {}).get("name"), settings.command_lambda_name)
    except Exception as e:
        logger.error("Failed to invoke command lambda: %s", e)

    return _ok({
        "type": _DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        "data": {"flags": _EPHEMERAL},
    })
