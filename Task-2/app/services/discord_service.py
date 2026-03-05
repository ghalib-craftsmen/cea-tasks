from __future__ import annotations

import logging
import urllib.request
import urllib.error
import json

from app.config import settings

logger = logging.getLogger(__name__)

DISCORD_API_BASE = "https://discord.com/api/v10"


def send_followup(interaction_token: str, content: str, ephemeral: bool = True) -> None:
    """Send a deferred follow-up message to Discord via the REST API."""
    url = f"{DISCORD_API_BASE}/webhooks/{settings.discord_public_key}/{interaction_token}"
    payload = {"content": content}
    if ephemeral:
        payload["flags"] = 64  # EPHEMERAL flag

    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bot {settings.discord_bot_token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            logger.info("Follow-up sent: status=%s", resp.status)
    except urllib.error.HTTPError as e:
        logger.error("Failed to send follow-up: %s %s", e.code, e.reason)
        raise
    except urllib.error.URLError as e:
        logger.error("Network error sending follow-up: %s", e.reason)
        raise
    except Exception as e:
        logger.error("Unexpected error sending follow-up: %s", e)
        raise


def send_channel_message(channel_id: str, content: str) -> None:
    """Post a message to a Discord channel (used for event announcements)."""
    url = f"{DISCORD_API_BASE}/channels/{channel_id}/messages"
    data = json.dumps({"content": content}).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bot {settings.discord_bot_token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            logger.info("Channel message sent: status=%s", resp.status)
    except urllib.error.HTTPError as e:
        logger.error("Failed to send channel message: %s %s", e.code, e.reason)
        raise
    except urllib.error.URLError as e:
        logger.error("Network error sending channel message: %s", e.reason)
        raise
    except Exception as e:
        logger.error("Unexpected error sending channel message: %s", e)
        raise
