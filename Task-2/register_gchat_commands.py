"""
Google Chat slash command definitions for the Meal Headcount Planner bot.

Google Chat commands are configured manually in the Google Cloud Console:
    APIs & Services → Google Chat API → Configuration → Slash commands

Command IDs must match _COMMAND_MAP in app/gchat_router.py.

Arguments are passed as plain text after the slash command. The first word
is the subcommand (for commands that have subcommands), followed by
positional parameters separated by spaces.

Usage:
    python register_gchat_commands.py
"""

# Google Chat does not have typed options like Discord. All arguments are
# positional text parsed by the router. The structure below documents the
# expected parameter order for each command/subcommand, mirroring the
# Discord COMMANDS in register_commands.py.

_STR = "string"
_BOOL = "boolean"
_USER = "string"  # Google user ID or email

COMMANDS = [
    {
        "command_id": 1,
        "name": "meal",
        "description": "Manage your meal preference",
        "subcommands": [
            # /meal status [user] [date]
            {
                "name": "status",
                "description": "Check meal status for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD). Defaults to today.", "required": False},
                ],
            },
            # /meal set <date> [opt_in] [meal_types] [user]
            {
                "name": "set",
                "description": "Update meal opt-in/out for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {"type": _BOOL, "name": "opt_in", "description": "true or false", "required": False},
                    {"type": _STR, "name": "meal_types", "description": "Comma-separated: LUNCH,SNACKS,IFTAR,EVENT_DINNER,OPTIONAL_DINNER", "required": False},
                    {"type": _USER, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                ],
            },
            # /meal bulk <start_date> <end_date> <opt_in> [user]
            {
                "name": "bulk",
                "description": "Set meal opt-in/out across a date range. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                    {"type": _BOOL, "name": "opt_in", "description": "true or false", "required": True},
                    {"type": _USER, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                ],
            },
        ],
    },
    {
        "command_id": 2,
        "name": "location",
        "description": "Manage work location",
        "subcommands": [
            # /location status [user] [date]
            {
                "name": "status",
                "description": "Check work location for a date. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD). Defaults to today.", "required": False},
                ],
            },
            # /location set <date> <location> [user]
            {
                "name": "set",
                "description": "Set work location. WFH auto-opts out of all meals.",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "location", "description": "OFFICE or WFH", "required": True},
                    {"type": _USER, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                ],
            },
            # /location bulk <start_date> <end_date> <location> [user]
            {
                "name": "bulk",
                "description": "Set work location across a date range. Team Lead/Admin can specify another user.",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "location", "description": "OFFICE or WFH", "required": True},
                    {"type": _USER, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
                ],
            },
        ],
    },
    # /headcount [date] [user]
    {
        "command_id": 3,
        "name": "headcount",
        "description": "Headcount summary (Admin/Team Lead) or own 30-day history (Employee)",
        "options": [
            {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": False},
            {"type": _USER, "name": "user", "description": "Target user (Google user ID or email)", "required": False},
        ],
    },
    # /event announce/optout/list/update/delete
    {
        "command_id": 6,
        "name": "event",
        "description": "Manage event meal days",
        "subcommands": [
            {
                "name": "announce",
                "description": "[Admin] Broadcast an announcement for a configured event meal day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "name": "optout",
                "description": "Opt out of an event meal day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "name": "list",
                "description": "Show all configured event days",
                "options": [],
            },
            {
                "name": "update",
                "description": "[Admin] Add or update an event day",
                "options": [
                    {"type": _STR, "name": "date", "description": "Event date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "description", "description": "Event description", "required": True},
                ],
            },
            {
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
        "command_id": 5,
        "name": "wfh-periods",
        "description": "Manage company-wide WFH schedules",
        "subcommands": [
            {
                "name": "set",
                "description": "[Admin] Set a company-wide WFH period",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "name": "delete",
                "description": "[Admin] Delete a company-wide WFH period",
                "options": [
                    {"type": _STR, "name": "start_date", "description": "Start date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "end_date", "description": "End date (YYYY-MM-DD)", "required": True},
                ],
            },
            {
                "name": "list",
                "description": "List all company-wide WFH periods in the next 2 months",
                "options": [],
            },
        ],
    },
    # /team-members [team_id]
    {
        "command_id": 4,
        "name": "team-members",
        "description": "[Team Lead / Admin] View members of your team. Admin can specify a team.",
        "options": [
            {"type": _STR, "name": "team_id", "description": "Team identifier (Admin only)", "required": False},
        ],
    },
    # /meal-type activate/deactivate/list
    {
        "command_id": 7,
        "name": "meal-type",
        "description": "Manage active meal types per date",
        "subcommands": [
            {
                "name": "activate",
                "description": "[Admin] Activate a meal type for a specific date",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "meal_type", "description": "IFTAR, EVENT_DINNER, or OPTIONAL_DINNER", "required": True},
                ],
            },
            {
                "name": "deactivate",
                "description": "[Admin] Deactivate a meal type for a specific date",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD)", "required": True},
                    {"type": _STR, "name": "meal_type", "description": "IFTAR, EVENT_DINNER, or OPTIONAL_DINNER", "required": True},
                ],
            },
            {
                "name": "list",
                "description": "Show active meal types for a date",
                "options": [
                    {"type": _STR, "name": "date", "description": "Target date (YYYY-MM-DD). Defaults to today.", "required": False},
                ],
            },
        ],
    },
]


if __name__ == "__main__":
    for cmd in COMMANDS:
        print(f"  ID {cmd['command_id']}: /{cmd['name']} — {cmd['description']}")
        for sub in cmd.get("subcommands", []):
            params = " ".join(
                f"<{o['name']}>" if o["required"] else f"[{o['name']}]"
                for o in sub["options"]
            )
            print(f"    /{cmd['name']} {sub['name']} {params}".rstrip())
