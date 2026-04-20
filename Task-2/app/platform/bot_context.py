from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass
class BotContext:
    """Platform-neutral context produced by both the Discord and GChat routers.

    The shared Command Lambda handler consumes this instead of
    platform-specific interaction payloads.
    """

    # Identity
    user_id: str
    role: Literal["EMPLOYEE", "TEAM_LEAD", "ADMIN"] = "EMPLOYEE"
    platform: Literal["discord", "gchat"] = "discord"

    # Command
    command: str = ""
    subcommand: str | None = None
    options: dict[str, Any] = field(default_factory=dict)

    # Platform-specific delivery context
    # Discord: interaction token for follow-up webhook
    # GChat: space resource name for reply, sender resource name for private msgs
    token: str = ""
    space: str = ""
    gchat_sender_name: str = ""

    # Discord-specific (kept for backward compat during migration)
    discord_roles: list[str] = field(default_factory=list)
    discord_application_id: str = ""
