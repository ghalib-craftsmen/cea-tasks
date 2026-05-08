from __future__ import annotations

import base64
import binascii
import json
import logging
import os
from typing import Any

import boto3
from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from app import commands
from app.config import settings
from app.models.discord_models import DiscordInteraction
from app.platform.bot_context import BotContext

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_PING                        = 1
_APPLICATION_COMMAND         = 2
_PONG                        = 1
_CHANNEL_MESSAGE_WITH_SOURCE = 4
_EPHEMERAL                   = 64

_SSM_PREFIX = os.environ.get("SSM_PREFIX", "")


def _load_public_key() -> str:
    env_key = os.environ.get("DISCORD_PUBLIC_KEY", "")
    if env_key:
        return env_key
    if _SSM_PREFIX:
        try:
            ssm = boto3.client("ssm", region_name=os.environ.get("AWS_REGION", "ap-southeast-1"))
            return ssm.get_parameter(Name=f"{_SSM_PREFIX}/DISCORD_PUBLIC_KEY")["Parameter"]["Value"]
        except Exception as exc:
            logger.error("Failed to load DISCORD_PUBLIC_KEY from SSM: %s", exc)
    return ""


_PUBLIC_KEY = _load_public_key()


def _verify_signature(event: dict, raw_body: bytes) -> bool:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    sig       = headers.get("x-signature-ed25519", "")
    timestamp = headers.get("x-signature-timestamp", "")
    if not sig or not timestamp or not _PUBLIC_KEY:
        return False
    try:
        verify_key = VerifyKey(bytes.fromhex(_PUBLIC_KEY))
        verify_key.verify(timestamp.encode() + raw_body, bytes.fromhex(sig))
        return True
    except (BadSignatureError, ValueError) as exc:
        logger.warning("Ed25519 signature verification failed: %s", exc)
        return False


def _ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def _err(status: int, message: str) -> dict:
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": message})}


def _build_context(payload: dict) -> BotContext:
    interaction = DiscordInteraction(**payload)
    roles = interaction.get_roles()

    if settings.role_admin_id in roles:
        role = "ADMIN"
    elif settings.role_team_lead_id in roles:
        role = "TEAM_LEAD"
    else:
        role = "EMPLOYEE"

    command    = ""
    subcommand = None
    options: dict[str, Any] = {}

    if interaction.data:
        command     = interaction.data.name
        raw_options = list(interaction.data.options)
        if raw_options and raw_options[0].type == 1:
            subcommand  = raw_options[0].name
            raw_options = list(raw_options[0].options or [])
        options = {opt.name: opt.value for opt in raw_options}

    return BotContext(
        user_id=interaction.get_user().id,
        role=role,
        platform="discord",
        command=command,
        subcommand=subcommand,
        options=options,
        token=interaction.token,
        discord_roles=roles,
        discord_application_id=interaction.application_id,
    )


def handler(event: dict, context: Any) -> dict:
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path   = event.get("rawPath", "")

    if method != "POST" or path != "/discord/interactions":
        return _err(404, "Not found")

    body_str: str = event.get("body", "") or ""
    try:
        raw_body = base64.b64decode(body_str) if event.get("isBase64Encoded") else body_str.encode()
    except binascii.Error:
        return _err(400, "Invalid request body")

    if not _verify_signature(event, raw_body):
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
        ctx = _build_context(payload)
    except Exception as exc:
        logger.error("Failed to build BotContext: %s", exc)
        return _err(400, "Invalid interaction payload")

    try:
        content, ephemeral = commands.route_command(ctx)
    except Exception as exc:
        logger.error("Unhandled error routing command: %s", exc)
        content, ephemeral = "An unexpected error occurred. Please try again.", True

    return _ok({
        "type": _CHANNEL_MESSAGE_WITH_SOURCE,
        "data": {
            "content": content,
            "flags": _EPHEMERAL if ephemeral else 0,
        },
    })
