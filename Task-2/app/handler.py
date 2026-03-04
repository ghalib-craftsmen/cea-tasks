from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from app.config import settings
from app.models.discord_models import DiscordInteraction
from app.models.meal_models import MealRecord
from app.services import headcount_service, meal_service

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Discord interaction types
_PING = 1
_APPLICATION_COMMAND = 2

# Discord response types
_PONG = 1
_CHANNEL_MESSAGE_WITH_SOURCE = 4

_EPHEMERAL = 64


# --------
# Helpers
# --------

def _ok(body: dict) -> dict:
    return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def _err(status: int, message: str) -> dict:
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": message})}


def _reply(content: str, ephemeral: bool = True) -> dict:
    flags = _EPHEMERAL if ephemeral else 0
    return _ok({"type": _CHANNEL_MESSAGE_WITH_SOURCE, "data": {"content": content, "flags": flags}})


def _has_role(interaction: DiscordInteraction, role_id: str) -> bool:
    return role_id in interaction.get_roles()


def _is_admin(interaction: DiscordInteraction) -> bool:
    return _has_role(interaction, settings.role_admin_id)


def _is_team_lead(interaction: DiscordInteraction) -> bool:
    return _has_role(interaction, settings.role_team_lead_id) or _is_admin(interaction)


def _get_option(options: list, name: str) -> Any:
    for opt in options:
        if opt.name == name:
            return opt.value
    return None



# -----------------------
# Signature verification
# -----------------------

def _verify_signature(headers: dict, raw_body: bytes) -> bool:
    sig = headers.get("x-signature-ed25519", "")
    timestamp = headers.get("x-signature-timestamp", "")

    if not sig or not timestamp:
        return False

    # Replay-attack protection: reject requests older than 5 minutes
    try:
        if abs(time.time() - float(timestamp)) > 300:
            return False
    except ValueError:
        return False

    try:
        verify_key = VerifyKey(bytes.fromhex(settings.discord_public_key))
        verify_key.verify(timestamp.encode() + raw_body, bytes.fromhex(sig))
        return True
    except (BadSignatureError, Exception):
        return False



# ----------------
# Command routing
# ----------------

def _handle_meal(interaction: DiscordInteraction, subcommand: str, options: list) -> dict:
    user = interaction.get_user()
    user_id = user.id

    if subcommand == "status":
        from datetime import date as _date
        target_date = _get_option(options, "date") or str(_date.today())
        record = meal_service.get_record(target_date, user_id)
        if not record:
            return _reply(f"No meal record found for {target_date}.")
        status = "opted in" if record.meal_opt_in else "opted out"
        return _reply(
            f"**{target_date}** — {status} | Location: {record.work_location} | Meal: {record.meal_type}"
        )

    if subcommand == "update":
        target_date = _get_option(options, "date")
        opt_in_val = _get_option(options, "opt_in")
        location = _get_option(options, "location")
        if not target_date:
            return _reply("Please provide a date.")
        msgs = []
        if opt_in_val is not None:
            if opt_in_val:
                msgs.append(meal_service.opt_in(target_date, user_id, updated_by=user_id))
            else:
                msgs.append(meal_service.opt_out(target_date, user_id, updated_by=user_id))
        if location:
            msgs.append(meal_service.update_location(target_date, user_id, location, updated_by=user_id))
        return _reply("\n".join(msgs) if msgs else "Nothing to update.")

    if subcommand == "optout":
        target_date = _get_option(options, "date")
        if not target_date:
            return _reply("Please provide a date.")
        msg = meal_service.opt_out(target_date, user_id, updated_by=user_id)
        return _reply(msg)

    if subcommand == "summary":
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to use this command.")
        target_date = _get_option(options, "date")
        if not target_date:
            return _reply("Please provide a date.")
        summary = headcount_service.daily_summary(target_date)
        return _reply(
            f"**Headcount for {target_date}**\n"
            f"Opted in: {summary['total_opted_in']} | Opted out: {summary['total_opted_out']}\n"
            f"Office: {summary['office']} | WFH: {summary['wfh']}"
        )

    if subcommand == "summary-all":
        if not _is_admin(interaction):
            return _reply("You do not have permission to use this command.")
        target_date = _get_option(options, "date")
        if not target_date:
            return _reply("Please provide a date.")
        summary = headcount_service.daily_summary(target_date)
        event_tag = " *(Event Day)*" if summary["is_event_day"] else ""
        return _reply(
            f"**Org-wide Headcount for {target_date}**{event_tag}\n"
            f"Opted in: {summary['total_opted_in']} | Opted out: {summary['total_opted_out']}\n"
            f"Office: {summary['office']} | WFH: {summary['wfh']}"
        )

    if subcommand == "override":
        if not _is_admin(interaction):
            return _reply("You do not have permission to use this command.")
        target_user = _get_option(options, "user")
        target_date = _get_option(options, "date")
        opt_in_val = _get_option(options, "opt_in")
        location = _get_option(options, "location")
        if not target_user or not target_date:
            return _reply("Please provide both user and date.")
        msgs = []
        if opt_in_val is not None:
            if opt_in_val:
                msgs.append(meal_service.opt_in(target_date, target_user, updated_by=user_id, bypass_cutoff=True))
            else:
                msgs.append(meal_service.opt_out(target_date, target_user, updated_by=user_id, bypass_cutoff=True))
        if location:
            msgs.append(meal_service.update_location(target_date, target_user, location, updated_by=user_id, bypass_cutoff=True))
        return _reply("\n".join(msgs) if msgs else "Nothing to update.")

    if subcommand == "event":
        action = _get_option(options, "action") or "announce"
        if action == "announce":
            if not _is_admin(interaction):
                return _reply("You do not have permission to use this command.")
            target_date = _get_option(options, "date")
            if not target_date:
                return _reply("Please provide a date.")
            if not meal_service.is_event_day(target_date):
                return _reply(f"{target_date} is not configured as an event day.")
            return _reply(
                f"**Event Meal Announcement**\n"
                f"A special event meal is scheduled for **{target_date}**. "
                f"All employees are opted in by default. Use `/meal optout {target_date}` to opt out before the cut-off.",
                ephemeral=False,
            )

    return _reply("Unknown subcommand.")


def _handle_special_day(interaction: DiscordInteraction, subcommand: str, options: list) -> dict:
    if not _is_admin(interaction):
        return _reply("You do not have permission to use this command.")

    if subcommand == "view":
        target_date = _get_option(options, "date")
        if not target_date:
            return _reply("Please provide a date.")
        events = meal_service._load_events()
        event = next((e for e in events if e.date == target_date), None)
        if event:
            return _reply(f"**{target_date}** is a special event day: _{event.description}_")
        return _reply(f"**{target_date}** is not a configured special day.")

    return _reply("Unknown subcommand.")


def _route_command(interaction: DiscordInteraction) -> dict:
    if not interaction.data:
        return _reply("No interaction data.")

    command = interaction.data.name
    options = interaction.data.options

    # Resolve subcommand and its options
    subcommand = None
    sub_options: list = []
    if options and options[0].type == 1:  # SUB_COMMAND type
        subcommand = options[0].name
        sub_options = options[0].options

    if command == "meal":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_meal(interaction, subcommand, sub_options)

    if command == "special-day":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_special_day(interaction, subcommand, sub_options)

    return _reply("Unknown command.")



# -------------------
# Lambda entry point
# -------------------

def handler(event: dict, context: Any) -> dict:
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path = event.get("rawPath", "")

    # Health check
    if method == "GET" and path == "/health":
        return _ok({"status": "ok"})

    if method != "POST" or path != "/interactions":
        return _err(404, "Not found")

    # Decode body
    body_str: str = event.get("body", "") or ""
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(body_str)
    else:
        raw_body = body_str.encode()

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}

    # Verify Ed25519 signature
    if not _verify_signature(headers, raw_body):
        logger.warning("Invalid signature")
        return _err(401, "Invalid request signature")

    payload = json.loads(raw_body)

    # Discord PING handshake
    if payload.get("type") == _PING:
        return _ok({"type": _PONG})

    # Guild authorization guard
    guild_id = payload.get("guild_id")
    if guild_id != settings.authorized_guild_id:
        logger.warning("Unauthorized guild: %s", guild_id)
        return _err(401, "Unauthorized guild")

    if payload.get("type") != _APPLICATION_COMMAND:
        return _err(400, "Unsupported interaction type")

    interaction = DiscordInteraction(**payload)
    return _route_command(interaction)
