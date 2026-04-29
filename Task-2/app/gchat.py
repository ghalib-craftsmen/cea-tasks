from __future__ import annotations

import base64
import binascii
import json
import logging
import uuid
from typing import Any

import boto3

from app import commands
from app.config import settings
from app.models.gchat_models import GChatEvent
from app.platform.bot_context import BotContext

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_table = _dynamodb.Table(settings.dynamodb_table)

# Google Chat commandId → MHP command name (must match Cloud Console registration)
_COMMAND_MAP: dict[str, str] = {
    "1": "meal",
    "2": "location",
    "3": "headcount",
    "4": "team-members",
    "5": "wfh-periods",
    "6": "event",
    "7": "meal-type",
}

# Commands that use subcommands as the first positional argument
_SUBCOMMAND_COMMANDS = {"meal", "location", "wfh-periods", "event", "meal-type"}

# Positional parameter names for each (command, subcommand) pair
_PARAM_SCHEMAS: dict[tuple[str, str | None], list[str]] = {
    ("meal", "status"):    ["user", "date"],
    ("meal", "set"):       ["date", "opt_in", "meal_types", "user"],
    ("meal", "bulk"):      ["start_date", "end_date", "opt_in", "user"],
    ("location", "status"):["user", "date"],
    ("location", "set"):   ["date", "location", "user"],
    ("location", "bulk"):  ["start_date", "end_date", "location", "user"],
    ("headcount", None):   ["date", "user"],
    ("team-members", None):["team_id"],
    ("wfh-periods", "set"):    ["start_date", "end_date"],
    ("wfh-periods", "delete"): ["start_date", "end_date"],
    ("wfh-periods", "list"):   [],
    ("event", "announce"): ["date"],
    ("event", "optout"):   ["date"],
    ("event", "list"):     [],
    ("event", "update"):   ["date", "description"],
    ("event", "delete"):   ["date"],
    ("meal-type", "activate"):   ["date", "meal_type"],
    ("meal-type", "deactivate"): ["date", "meal_type"],
    ("meal-type", "list"):       ["date"],
}

_BOOL_STRINGS = {"true": True, "false": False, "yes": True, "no": False, "1": True, "0": False}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def _err(status: int, message: str) -> dict:
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": message})}


# ---------------------------------------------------------------------------
# Identity Resolution & Auto-Registration (§3.4)
# ---------------------------------------------------------------------------

def _resolve_or_register_user(google_user_id: str, email: str) -> tuple[str, str]:
    """Resolve internal userId and role from DynamoDB, or auto-register.

    Returns (user_id, role).
    """
    ext_key = f"EXTID#GCHAT#{google_user_id}"

    # Look up existing identity mapping
    resp = _table.get_item(Key={"PK": ext_key, "SK": ext_key})
    item = resp.get("Item")

    if item:
        user_id = item["user_id"]
    else:
        # Auto-register: create identity mapping + user metadata
        user_id = str(uuid.uuid4())
        _table.put_item(Item={
            "PK": ext_key,
            "SK": ext_key,
            "user_id": user_id,
            "email": email,
        })
        _table.put_item(Item={
            "PK": f"USER#{user_id}",
            "SK": "METADATA",
            "GSI1PK": "USERS",
            "GSI1SK": f"USER#{user_id}",
            "user_id": user_id,
            "email": email,
            "role": "EMPLOYEE",
            "platform": "gchat",
        })
        logger.info("Auto-registered GChat user %s as %s", google_user_id, user_id)

    # Fetch role from user metadata
    user_resp = _table.get_item(Key={"PK": f"USER#{user_id}", "SK": "METADATA"})
    user_item = user_resp.get("Item", {})
    role = user_item.get("role", "EMPLOYEE")

    return user_id, role


# ---------------------------------------------------------------------------
# Argument Parsing
# ---------------------------------------------------------------------------

def _coerce_value(name: str, raw: str) -> Any:
    """Coerce a raw string argument to the appropriate Python type."""
    if name == "opt_in":
        return _BOOL_STRINGS.get(raw.lower(), raw)
    if name == "meal_types":
        return [mt.strip().upper() for mt in raw.split(",") if mt.strip()]
    return raw


def _parse_arguments(command: str, argument_text: str) -> tuple[str | None, dict[str, Any]]:
    """Parse Google Chat argumentText into (subcommand, options dict)."""
    tokens = argument_text.strip().split() if argument_text.strip() else []

    subcommand: str | None = None
    if command in _SUBCOMMAND_COMMANDS:
        if tokens:
            subcommand = tokens.pop(0).lower()
        else:
            return None, {}

    schema = _PARAM_SCHEMAS.get((command, subcommand), [])
    options: dict[str, Any] = {}

    # Special case: "description" consumes all remaining tokens
    for i, param_name in enumerate(schema):
        if i >= len(tokens):
            break
        if param_name == "description":
            options[param_name] = " ".join(tokens[i:])
            break
        options[param_name] = _coerce_value(param_name, tokens[i])

    return subcommand, options


# ---------------------------------------------------------------------------
# Lambda Handler
# ---------------------------------------------------------------------------

def handler(event: dict, context: Any) -> dict:
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")
    logger.info("GChat request: method=%s path=%s body=%s", method, path, event.get("body", ""))

    if method != "POST" or path != "/gchat/interactions":
        logger.warning("Rejected: method=%s path=%s", method, path)
        return _err(404, "Not found")

    # --- Decode body ---
    body_str: str = event.get("body", "") or ""
    try:
        raw_body = base64.b64decode(body_str) if event.get("isBase64Encoded") else body_str.encode()
    except binascii.Error:
        logger.warning("Body base64 decode failed")
        return _err(400, "Invalid request body")

    # JWT verification is handled by the API Gateway JWT authorizer.

    # --- Parse payload ---
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.warning("Body JSON parse failed")
        return _err(400, "Invalid request body")

    logger.info("Parsed payload keys: %s", list(payload.keys()))

    # Google Chat newer format nests data under chat.appCommandPayload
    chat_data = payload.get("chat", payload)
    app_payload = chat_data.get("appCommandPayload", chat_data)

    # Build a flat structure that GChatEvent expects
    event_data = {
        "type": payload.get("type", ""),
        "eventTime": chat_data.get("eventTime", ""),
        "space": app_payload.get("space", chat_data.get("space", {})),
        "message": app_payload.get("message", chat_data.get("message", {})),
        "user": chat_data.get("user", {}),
    }

    logger.info("event_data: %s", event_data)

    gchat_event = GChatEvent(**event_data)

    # --- Space authorization guard (§3.4) ---
    logger.info("Space: %s | Authorized: %s", gchat_event.get_space_name(), settings.gchat_authorized_space)
    if gchat_event.get_space_name() != settings.gchat_authorized_space:
        logger.warning("Unauthorized space: %s", gchat_event.get_space_name())
        return _err(401, "Unauthorized space")

    # --- Identity resolution ---
    sender = gchat_event.get_sender()
    google_user_id = sender.get_google_user_id()
    logger.info("Sender: %s user_id=%s", sender.name, google_user_id)
    if not google_user_id:
        logger.warning("Unable to identify sender")
        return _err(400, "Unable to identify sender")

    user_id, role = _resolve_or_register_user(google_user_id, sender.email)

    # --- Parse command ---
    slash_cmd = gchat_event.message.slashCommand
    logger.info("Slash command: %s", slash_cmd)
    if not slash_cmd or not slash_cmd.commandId:
        logger.warning("No slash command in payload")
        return _err(400, "No slash command in payload")

    command = _COMMAND_MAP.get(slash_cmd.get_command_id())
    if not command:
        return _err(400, f"Unknown command ID: {slash_cmd.commandId}")

    subcommand, options = _parse_arguments(command, gchat_event.message.argumentText)

    # --- Build BotContext ---
    bot_ctx = BotContext(
        user_id=user_id,
        role=role,
        platform="gchat",
        command=command,
        subcommand=subcommand,
        options=options,
        space=gchat_event.get_space_name(),
        gchat_sender_name=sender.name,
    )

    # --- Run command inline ---
    try:
        content, ephemeral = commands.route_command(bot_ctx)
    except Exception as exc:
        logger.error("Unhandled error routing command: %s", exc)
        content, ephemeral = "An unexpected error occurred. Please try again.", True

    response_body: dict = {"text": content}
    if ephemeral and sender.name:
        response_body["privateMessageViewer"] = {"name": sender.name}

    return _ok(response_body)
