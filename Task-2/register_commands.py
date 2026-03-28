"""
Register all slash commands for the Meal Headcount Planner bot.

Usage:
    python register_commands.py

Reads DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, and AUTHORIZED_GUILD_ID
from the environment (or .env file).

Commands are registered guild-scoped (instant) rather than global (up to 1 hour delay).
To switch to global, remove the GUILD_ID from the URL below.
"""
from __future__ import annotations

import json
import urllib.request
import urllib.error

from dotenv import load_dotenv

load_dotenv()

from app.config import settings  # noqa: E402 — load_dotenv must run first

# Option types (Discord API)
_STR = 3
_BOOL = 5
_USER = 6

COMMANDS = [
    {
        "name": "meal",
        "description": "Manage your meal preference",
        "options": [
            # /meal status [user] [date]
            {
                "type": 1,
                "name": "status",
                "description": "Check meal status for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {
                        "type": _STR,
                        "name": "date",
                        "description": "Target date (YYYY-MM-DD). Defaults to today.",
                        "required": False,
                    },
                    {
                        "type": _USER,
                        "name": "user",
                        "description": "Target user (Team Lead / Admin only)",
                        "required": False,
                    },
                ],
            },
            # /meal set <date> [opt_in] [meal_types] [user]
            {
                "type": 1,
                "name": "set",
                "description": "Update meal opt-in/out for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {"type": _BOOL, "name": "opt_in", "description": "Opt in (true) or out (false)", "required": False},
                    {"type": _BOOL, "name": "lunch", "description": "Select Lunch", "required": False},
                    {"type": _BOOL, "name": "snacks", "description": "Select Snacks", "required": False},
                    {"type": _BOOL, "name": "iftar", "description": "Select Iftar", "required": False},
                    {"type": _BOOL, "name": "event_dinner", "description": "Select Event Dinner", "required": False},
                    {"type": _BOOL, "name": "optional_dinner", "description": "Select Optional Dinner", "required": False},
                    {"type": _USER, "name": "user", "description": "Target user (Team Lead / Admin only)", "required": False},
                ],
            },
            # /meal bulk <start_date> <end_date> <opt_in> [user]
            {
                "type": 1,
                "name": "bulk",
                "description": "Set meal opt-in/out across a date range. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                    {"type": _BOOL, "name": "opt_in", "description": "Opt in (true) or out (false)", "required": True},
                    {"type": _USER, "name": "user", "description": "Target user (Team Lead / Admin only)", "required": False},
                ],
            },
        ],
    },
    {
        "name": "location",
        "description": "Manage work location",
        "options": [
            # /location status [user] [date]
            {
                "type": 1,
                "name": "status",
                "description": "Check work location for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {
                        "type": _STR,
                        "name": "date",
                        "description": "Target date (YYYY-MM-DD). Defaults to today.",
                        "required": False,
                    },
                    {
                        "type": _USER,
                        "name": "user",
                        "description": "Target user (Team Lead / Admin only)",
                        "required": False,
                    },
                ],
            },
            # /location set <date> <location> [user]
            {
                "type": 1,
                "name": "set",
                "description": "Set work location for a date (WFH auto-opts out of all meals). Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {
                        "type": _STR,
                        "name": "location",
                        "description": "OFFICE or WFH",
                        "required": True,
                        "choices": [
                            {"name": "Office", "value": "OFFICE"},
                            {"name": "WFH", "value": "WFH"},
                        ],
                    },
                    {
                        "type": _USER,
                        "name": "user",
                        "description": "Target user (Team Lead / Admin only)",
                        "required": False,
                    },
                ],
            },
            # /location bulk <start_date> <end_date> <location> [user]
            {
                "type": 1,
                "name": "bulk",
                "description": "Set work location across a date range. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                    {
                        "type": _STR,
                        "name": "location",
                        "description": "OFFICE or WFH",
                        "required": True,
                        "choices": [
                            {"name": "Office", "value": "OFFICE"},
                            {"name": "WFH", "value": "WFH"},
                        ],
                    },
                    {"type": _USER, "name": "user", "description": "Target user (Team Lead / Admin only)", "required": False},
                ],
            },
        ],
    },
    # /headcount [date] [user]
    {
        "name": "headcount",
        "description": "Headcount summary (Admin/Team Lead) or own 30-day history (Employee)",
        "options": [
            {
                "type": _STR,
                "name": "date",
                "description": "Target date (YYYY-MM-DD). Required for Team Lead / Admin aggregate view.",
                "required": False,
            },
            {
                "type": _USER,
                "name": "user",
                "description": "Team Lead / Admin only: show this user's record instead of aggregate.",
                "required": False,
            },
        ],
    },
    # /event announce/optout/list/update/delete
    {
        "name": "event",
        "description": "Manage event meal days",
        "options": [
            {
                "type": 1,
                "name": "announce",
                "description": "[Admin] Broadcast an announcement for a configured event meal day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "type": 1,
                "name": "optout",
                "description": "Opt out of an event meal day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "type": 1,
                "name": "list",
                "description": "Show all configured event days",
                "options": [],
            },
            {
                "type": 1,
                "name": "update",
                "description": "[Admin] Add or update an event day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "description", "description": "Event description", "required": True},
                ],
            },
            {
                "type": 1,
                "name": "delete",
                "description": "[Admin] Delete a configured event day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                ],
            },
        ],
    },
    # /wfh-periods set/delete/list
    {
        "name": "wfh-periods",
        "description": "Manage company-wide WFH schedules",
        "options": [
            {
                "type": 1,
                "name": "set",
                "description": "[Admin] Set a company-wide WFH period",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "type": 1,
                "name": "delete",
                "description": "[Admin] Delete a company-wide WFH period",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "type": 1,
                "name": "list",
                "description": "List all company-wide WFH periods in the next 2 months",
                "options": [],
            },
        ],
    },
    # /team-members  (Team Lead / Admin)
    {
        "name": "team-members",
        "description": "[Team Lead / Admin] View team members with their WFH day counts for the current month.",
        "options": [],
    },
    # /meal-type activate/deactivate/list
    {
        "name": "meal-type",
        "description": "Manage active meal types per date",
        "options": [
            {
                "type": 1,
                "name": "activate",
                "description": "[Admin] Activate a meal type for a specific date",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {
                        "type": _STR,
                        "name": "meal_type",
                        "description": "Meal type to activate",
                        "required": True,
                        "choices": [
                            {"name": "Iftar", "value": "IFTAR"},
                            {"name": "Event Dinner", "value": "EVENT_DINNER"},
                            {"name": "Optional Dinner", "value": "OPTIONAL_DINNER"},
                        ],
                    },
                ],
            },
            {
                "type": 1,
                "name": "deactivate",
                "description": "[Admin] Deactivate a meal type for a specific date",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {
                        "type": _STR,
                        "name": "meal_type",
                        "description": "Meal type to deactivate",
                        "required": True,
                        "choices": [
                            {"name": "Iftar", "value": "IFTAR"},
                            {"name": "Event Dinner", "value": "EVENT_DINNER"},
                            {"name": "Optional Dinner", "value": "OPTIONAL_DINNER"},
                        ],
                    },
                ],
            },
            {
                "type": 1,
                "name": "list",
                "description": "Show active meal types for a date",
                "options": [
                    {
                        "type": _STR,
                        "name": "date",
                        "description": "Target date (YYYY-MM-DD). Defaults to today.",
                        "required": False,
                    },
                ],
            },
        ],
    },
]


def register() -> None:
    app_id = settings.discord_application_id
    guild_id = settings.authorized_guild_id
    token = settings.discord_bot_token

    # Guild-scoped: instant propagation. For global (1hr delay), use:
    # url = f"https://discord.com/api/v10/applications/{app_id}/commands"
    url = f"https://discord.com/api/v10/applications/{app_id}/guilds/{guild_id}/commands"

    data = json.dumps(COMMANDS).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bot {token}",
            "User-Agent": "DiscordBot (https://github.com/ghalib-craftsmen/cea-tasks/Task-2, 1.0)",
        },
        method="PUT",  # PUT replaces the full command list atomically
    )

    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read())
            print(f"OK — registered {len(body)} command(s):")
            for cmd in body:
                print(f"  /{cmd['name']}")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}")
        raise


if __name__ == "__main__":
    register()
