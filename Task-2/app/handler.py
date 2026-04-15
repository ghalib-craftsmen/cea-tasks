from __future__ import annotations

import logging
from datetime import date as _date, timedelta
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

from app.config import settings
from app.models.discord_models import DiscordInteraction
from app.models.meal_models import MealRecord
from app.platform.bot_context import BotContext
from app.services import discord_service, gchat_service, headcount_service, meal_service, team_service

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_table = _dynamodb.Table(settings.dynamodb_table)


# ---------------------------------------------------------------------------
# Platform Detection & BotContext Construction
# ---------------------------------------------------------------------------

def _discord_to_bot_context(interaction: DiscordInteraction) -> BotContext:
    """Convert a DiscordInteraction into a platform-neutral BotContext."""
    roles = interaction.get_roles()
    if settings.role_admin_id in roles:
        role = "ADMIN"
    elif settings.role_team_lead_id in roles:
        role = "TEAM_LEAD"
    else:
        role = "EMPLOYEE"

    command = ""
    subcommand = None
    options: dict[str, Any] = {}

    if interaction.data:
        command = interaction.data.name
        raw_options = list(interaction.data.options)
        if raw_options and raw_options[0].type == 1:
            subcommand = raw_options[0].name
            raw_options = list(raw_options[0].options)
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


# ---------------------------------------------------------------------------
# Role Checks
# ---------------------------------------------------------------------------

def _is_admin(ctx: BotContext) -> bool:
    return ctx.role == "ADMIN"


def _is_team_lead(ctx: BotContext) -> bool:
    return ctx.role in ("TEAM_LEAD", "ADMIN")


# ---------------------------------------------------------------------------
# User Helpers
# ---------------------------------------------------------------------------

def _user_label(ctx: BotContext, user_id: str) -> str:
    """Format a user reference appropriate for the platform."""
    if ctx.platform == "discord":
        return f"<@{user_id}>"
    return user_id


def _resolve_user_param(ctx: BotContext, identifier: str) -> str | None:
    """Resolve a user parameter to an internal userId.

    Discord: the identifier IS the internal userId (snowflake).
    GChat: resolve Google user ID or email → internal userId via DynamoDB.
    """
    if ctx.platform == "discord":
        return identifier

    # Try EXTID lookup by Google user ID
    ext_key = f"EXTID#GCHAT#{identifier}"
    resp = _table.get_item(Key={"PK": ext_key, "SK": ext_key})
    item = resp.get("Item")
    if item:
        return item["user_id"]

    # Try email lookup via GSI1 (all users)
    resp = _table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq("USERS"),
        FilterExpression=Attr("email").eq(identifier),
    )
    items = resp.get("Items", [])
    if items:
        return items[0]["user_id"]

    return None


# ---------------------------------------------------------------------------
# Option Helpers
# ---------------------------------------------------------------------------

def _collect_meal_types(ctx: BotContext) -> list[str] | None:
    """Collect meal types from options. Returns None if none selected (means all)."""
    # GChat: pre-parsed list
    mt = ctx.options.get("meal_types")
    if mt and isinstance(mt, list):
        return mt
    # Discord: individual boolean options
    selected = [
        name.upper()
        for name in ("lunch", "snacks", "iftar", "event_dinner", "optional_dinner")
        if ctx.options.get(name)
    ]
    return selected or None


def _reply(content: str, ephemeral: bool = True) -> tuple[str, bool]:
    return content, ephemeral


# ---------------------------------------------------------------------------
# Command Handlers (all take BotContext)
# ---------------------------------------------------------------------------

def _handle_meal_status(ctx: BotContext) -> tuple[str, bool]:
    target_user = ctx.options.get("user")
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id and not _is_team_lead(ctx):
            return _reply("You do not have permission to view another user's meal status.")
    else:
        target_user = ctx.user_id
    target_date = ctx.options.get("date") or str(_date.today())
    record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
    if not record.meal_opt_in:
        status = "opted out (all meals)"
    elif record.opted_out_meals:
        status = f"opted out of: {', '.join(record.opted_out_meals)}"
    else:
        status = "opted in (all meals)"
    label = _user_label(ctx, target_user) if target_user != ctx.user_id else "You"
    return _reply(f"**{target_date}** — {label}: {status} | Location: {record.work_location}")


def _handle_meal_set(ctx: BotContext) -> tuple[str, bool]:
    target_date = ctx.options.get("date")
    if not target_date:
        return _reply("Please provide a date.")
    target_user = ctx.options.get("user")
    bypass = False
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id:
            if not _is_team_lead(ctx):
                return _reply("You do not have permission to update another user's meal record.")
            bypass = True
    else:
        target_user = ctx.user_id
    opt_in_val = ctx.options.get("opt_in")
    meal_types = _collect_meal_types(ctx)
    if opt_in_val is not None:
        fn = meal_service.opt_in if opt_in_val else meal_service.opt_out
        return _reply(fn(target_date, target_user, updated_by=ctx.user_id, meal_types=meal_types, bypass_cutoff=bypass))
    if meal_types:
        return _reply(meal_service.opt_out(target_date, target_user, updated_by=ctx.user_id, meal_types=meal_types, bypass_cutoff=bypass))
    return _reply("Nothing to update.")


def _handle_meal_bulk(ctx: BotContext) -> tuple[str, bool]:
    start_date = ctx.options.get("start_date")
    end_date = ctx.options.get("end_date")
    opt_in_val = ctx.options.get("opt_in")
    if not start_date or not end_date or opt_in_val is None:
        return _reply("Please provide start_date, end_date, and opt_in.")
    target_user = ctx.options.get("user")
    bypass = False
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id:
            if not _is_team_lead(ctx):
                return _reply("You do not have permission to bulk-update another user's meal records.")
            bypass = True
    else:
        target_user = ctx.user_id
    return _reply(meal_service.bulk_meal_update(start_date, end_date, opt_in_val, target_user, updated_by=ctx.user_id, bypass_cutoff=bypass))


def _handle_location_status(ctx: BotContext) -> tuple[str, bool]:
    target_user = ctx.options.get("user")
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id and not _is_team_lead(ctx):
            return _reply("You do not have permission to view another user's location.")
    else:
        target_user = ctx.user_id
    target_date = ctx.options.get("date") or str(_date.today())
    record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
    label = _user_label(ctx, target_user) if target_user != ctx.user_id else "You"
    return _reply(f"**{target_date}** — {label}: {record.work_location}")


def _handle_work_location(ctx: BotContext) -> tuple[str, bool]:
    target_date = ctx.options.get("date")
    location = ctx.options.get("location")
    if not target_date or not location:
        return _reply("Please provide both date and location.")
    target_user = ctx.options.get("user")
    bypass = False
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id:
            if not _is_team_lead(ctx):
                return _reply("You do not have permission to update another user's location.")
            bypass = True
    else:
        target_user = ctx.user_id
    return _reply(meal_service.update_location(target_date, target_user, location, updated_by=ctx.user_id, bypass_cutoff=bypass))


def _handle_location_bulk(ctx: BotContext) -> tuple[str, bool]:
    start_date = ctx.options.get("start_date")
    end_date = ctx.options.get("end_date")
    location = ctx.options.get("location")
    if not start_date or not end_date or not location:
        return _reply("Please provide start_date, end_date, and location.")
    target_user = ctx.options.get("user")
    bypass = False
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if not resolved:
            return _reply(f"User not found: {target_user}")
        target_user = resolved
        if target_user != ctx.user_id:
            if not _is_team_lead(ctx):
                return _reply("You do not have permission to bulk-update another user's location records.")
            bypass = True
    else:
        target_user = ctx.user_id
    return _reply(meal_service.bulk_location_update(start_date, end_date, location, target_user, updated_by=ctx.user_id, bypass_cutoff=bypass))


_LOCATION_HANDLERS = {
    "status": _handle_location_status,
    "set":    _handle_work_location,
    "bulk":   _handle_location_bulk,
}

_MEAL_HANDLERS = {
    "status": _handle_meal_status,
    "set":    _handle_meal_set,
    "bulk":   _handle_meal_bulk,
}


def _handle_meal(ctx: BotContext) -> tuple[str, bool]:
    handler_fn = _MEAL_HANDLERS.get(ctx.subcommand)
    if not handler_fn:
        return _reply("Unknown subcommand.")
    return handler_fn(ctx)


_MEAL_TYPE_LABELS = {
    "LUNCH": "Lunch",
    "SNACKS": "Snacks",
    "IFTAR": "Iftar",
    "EVENT_DINNER": "Event Dinner",
    "OPTIONAL_DINNER": "Optional Dinner",
}


def _format_headcount_summary(summary: dict, title: str) -> str:
    total = summary["total_opted_in"] + summary["total_opted_out"]
    event_tag = " *(Event Day)*" if summary.get("is_event_day") else ""
    lines = [
        f"**{title}**{event_tag}",
        "",
        "**Overall**",
        f"Total: {total} | Opted in: {summary['total_opted_in']} | Opted out: {summary['total_opted_out']}",
        "",
        "**By Meal Type**",
    ]
    for mt, count in summary["by_meal_type"].items():
        lines.append(f"  {_MEAL_TYPE_LABELS.get(mt, mt)}: {count}")
    lines += [
        "",
        "**Office vs WFH**",
        f"  Office: {summary['office']} | WFH: {summary['wfh']}",
    ]
    return "\n".join(lines)


def _handle_headcount(ctx: BotContext) -> tuple[str, bool]:
    target_date = ctx.options.get("date")
    target_user = ctx.options.get("user")

    if _is_admin(ctx) or _is_team_lead(ctx):
        if target_user:
            resolved = _resolve_user_param(ctx, target_user)
            if not resolved:
                return _reply(f"User not found: {target_user}")
            target_user = resolved
            if not target_date:
                return _reply("Please provide a date when specifying a user.")
            record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
            if not record.meal_opt_in:
                status = "opted out (all meals)"
            elif record.opted_out_meals:
                status = f"opted out of: {', '.join(record.opted_out_meals)}"
            else:
                status = "opted in (all meals)"
            label = _user_label(ctx, target_user)
            return _reply(f"**{target_date}** — {label}: {status} | Location: {record.work_location}")

        if target_date:
            if _is_admin(ctx):
                summary = headcount_service.daily_summary(target_date)
                return _reply(_format_headcount_summary(summary, f"Org-wide Headcount for {target_date}"))
            team = team_service.get_user_team(ctx.user_id)
            if not team:
                return _reply("You are not assigned to any team. Ask an Admin to add you to a team.")
            member_ids = team_service.get_team_members(team["team_id"])
            summary = headcount_service.team_summary(target_date, member_ids)
            return _reply(_format_headcount_summary(summary, f"Team **{team['name']}** Headcount for {target_date}"))
        # No date and no user — fall through to employee 30-day history

    # Employee: own history
    if target_user:
        resolved = _resolve_user_param(ctx, target_user)
        if resolved and resolved != ctx.user_id:
            return _reply("You do not have permission to view another user's headcount.")

    if target_date:
        record = meal_service.get_record(target_date, ctx.user_id) or MealRecord(date=target_date, user_id=ctx.user_id)
        if not record.meal_opt_in:
            status = "opted out (all meals)"
        elif record.opted_out_meals:
            status = f"opted out of: {', '.join(record.opted_out_meals)}"
        else:
            status = "opted in (all meals)"
        return _reply(f"**{target_date}** — Meal: {status} | Location: {record.work_location}")

    # 30-day rolling history
    cutoff = str(_date.today() - timedelta(days=30))
    records = sorted(
        [r for r in meal_service.get_user_history(ctx.user_id) if r.date >= cutoff],
        key=lambda r: r.date,
        reverse=True,
    )
    if not records:
        return _reply("No records found in the last 30 days.")
    lines = ["**Your meal & location history (last 30 days)**"]
    for r in records:
        if not r.meal_opt_in:
            meal_status = "Opted out (all)"
        elif r.opted_out_meals:
            meal_status = f"Out: {', '.join(r.opted_out_meals)}"
        else:
            meal_status = "Opted in (all)"
        lines.append(f"`{r.date}` — Meal: {meal_status} | Location: {r.work_location}")
    return _reply("\n".join(lines))


def _handle_event(ctx: BotContext) -> tuple[str, bool]:
    subcommand = ctx.subcommand

    if subcommand == "list":
        events = meal_service.list_events_from_db()
        if not events:
            return _reply("No event days are currently configured.")
        lines = ["**Configured Event Days**"]
        for e in events:
            lines.append(f"  `{e['date']}` — {e.get('description', '(no description)')}")
        return _reply("\n".join(lines))

    if subcommand == "optout":
        target_date = ctx.options.get("date")
        if not target_date:
            return _reply("Please provide a date.")
        if not meal_service.is_event_day(target_date):
            return _reply(f"{target_date} is not a configured event day. Use `/meal set` to change your meal preference.")
        return _reply(meal_service.opt_out(target_date, ctx.user_id, updated_by=ctx.user_id))

    if not _is_admin(ctx):
        return _reply("You do not have permission to use this command.")

    target_date = ctx.options.get("date")
    if not target_date:
        return _reply("Please provide a date.")

    if subcommand == "announce":
        if not meal_service.is_event_day(target_date):
            return _reply(f"{target_date} is not a configured event day.")
        message = (
            f"**Event Meal Announcement**\n"
            f"A special event meal is scheduled for **{target_date}**. "
            f"All employees are opted in by default. Use `/event optout {target_date}` to opt out before the cut-off."
        )
        posted_to = []
        if settings.announcement_channel_id:
            try:
                discord_service.send_channel_message(settings.announcement_channel_id, message)
                posted_to.append("Discord")
            except Exception as exc:
                logger.error("Failed to post event announcement to Discord channel: %s", exc)
        if settings.gchat_announcement_space:
            try:
                gchat_service.send_message(settings.gchat_announcement_space, message)
                posted_to.append("Google Chat")
            except Exception as exc:
                logger.error("Failed to post event announcement to GChat space: %s", exc)
        if posted_to:
            return _reply(f"Announcement posted to: {', '.join(posted_to)}.")
        return _reply(message, ephemeral=False)

    if subcommand == "update":
        description = ctx.options.get("description") or ""
        return _reply(meal_service.update_event(target_date, description, set_by=ctx.user_id))

    if subcommand == "delete":
        return _reply(meal_service.delete_event(target_date))

    return _reply("Unknown subcommand.")


def _handle_wfh_periods(ctx: BotContext) -> tuple[str, bool]:
    subcommand = ctx.subcommand

    if subcommand == "list":
        periods = meal_service.list_wfh_periods()
        if not periods:
            return _reply("No company-wide WFH periods scheduled in the next 2 months.")
        lines = ["**Upcoming WFH Periods**"]
        for p in periods:
            lines.append(f"  {p['start_date']} → {p['end_date']}")
        return _reply("\n".join(lines))

    if not _is_admin(ctx):
        return _reply("You do not have permission to manage WFH periods.")

    start_date = ctx.options.get("start_date")
    end_date = ctx.options.get("end_date")
    if not start_date or not end_date:
        return _reply("Please provide both start_date and end_date.")

    if subcommand == "set":
        return _reply(meal_service.set_wfh_period(start_date, end_date, set_by=ctx.user_id))
    if subcommand == "delete":
        return _reply(meal_service.delete_wfh_period(start_date, end_date))
    return _reply("Unknown subcommand.")


def _handle_meal_type(ctx: BotContext) -> tuple[str, bool]:
    subcommand = ctx.subcommand

    if subcommand == "list":
        target_date = ctx.options.get("date") or str(_date.today())
        active = meal_service.get_active_meal_types(target_date)
        if not active:
            return _reply(f"No active meal types for **{target_date}**.")
        labels = [_MEAL_TYPE_LABELS.get(mt, mt) for mt in active]
        return _reply(f"**Active meal types for {target_date}:** {', '.join(labels)}")

    if not _is_admin(ctx):
        return _reply("You do not have permission to use this command.")

    target_date = ctx.options.get("date")
    meal_type = ctx.options.get("meal_type")
    if not target_date or not meal_type:
        return _reply("Please provide both date and meal_type.")

    if subcommand == "activate":
        return _reply(meal_service.activate_meal_type(target_date, meal_type, set_by=ctx.user_id))
    if subcommand == "deactivate":
        return _reply(meal_service.deactivate_meal_type(target_date, meal_type))
    return _reply("Unknown subcommand.")


def _handle_team_members(ctx: BotContext) -> tuple[str, bool]:
    if not _is_team_lead(ctx):
        return _reply("You do not have permission to use this command.")

    team_id = ctx.options.get("team_id")

    # Admin with no team_id — list all teams
    if not team_id and _is_admin(ctx):
        teams = team_service.list_teams()
        if not teams:
            return _reply("No teams configured.")
        lines = ["**All Teams**"]
        for t in teams:
            count = len(team_service.get_team_members(t["team_id"]))
            lead_label = _user_label(ctx, t["lead_user_id"])
            lines.append(f"  `{t['team_id']}` — **{t['name']}** | Lead: {lead_label} | {count} member(s)")
        return _reply("\n".join(lines))

    if team_id:
        if not _is_admin(ctx):
            return _reply("Only Admins can specify a team. Team Leads see their own team.")
        team = team_service.get_team(team_id)
    else:
        team = team_service.get_user_team(ctx.user_id)

    if not team:
        return _reply("Team not found." if team_id else "You are not assigned to any team.")

    members = team_service.get_team_members(team["team_id"])
    month_prefix = str(_date.today())[:7]
    try:
        wfh_summary = meal_service.get_monthly_wfh_summary(month_prefix)
    except RuntimeError:
        return _reply("Failed to retrieve WFH data. Please try again later.")
    lead_label = _user_label(ctx, team["lead_user_id"])
    member_lines = "\n".join(
        f"  {_user_label(ctx, uid)} — WFH this month: {wfh_summary.get(uid, 0)}"
        for uid in members
    ) or "  (no members)"
    return _reply(
        f"**{team['name']}** (`{team['team_id']}`) — Lead: {lead_label}\n"
        f"Members ({len(members)}) — {month_prefix}:\n{member_lines}"
    )


# ---------------------------------------------------------------------------
# Command Routing
# ---------------------------------------------------------------------------

def _route_command(ctx: BotContext) -> tuple[str, bool]:
    command = ctx.command
    subcommand = ctx.subcommand

    if command == "meal":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_meal(ctx)

    if command == "location":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        handler_fn = _LOCATION_HANDLERS.get(subcommand)
        if not handler_fn:
            return _reply("Unknown subcommand.")
        return handler_fn(ctx)

    if command == "headcount":
        return _handle_headcount(ctx)

    if command == "team-members":
        return _handle_team_members(ctx)

    if command == "wfh-periods":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_wfh_periods(ctx)

    if command == "event":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_event(ctx)

    if command == "meal-type":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_meal_type(ctx)

    return _reply("Unknown command.")


# ---------------------------------------------------------------------------
# Lambda Entry Point
# ---------------------------------------------------------------------------

def handler(event: dict, context: Any) -> None:
    try:
        if "platform" in event:
            # GChat payload — already a serialized BotContext
            ctx = BotContext(**event)
        else:
            # Discord payload — convert to BotContext
            interaction = DiscordInteraction(**event)
            ctx = _discord_to_bot_context(interaction)
    except Exception as exc:
        logger.error("Failed to parse interaction payload: %s", exc)
        return

    try:
        content, ephemeral = _route_command(ctx)
    except Exception as exc:
        logger.error("Unhandled error routing command: %s", exc)
        content, ephemeral = "An unexpected error occurred. Please try again.", True

    try:
        if ctx.platform == "discord":
            discord_service.send_followup(ctx.token, content, ephemeral=ephemeral)
        elif ctx.platform == "gchat":
            gchat_service.send_message(ctx.space, content)
    except Exception as exc:
        logger.error("Failed to send response on %s: %s", ctx.platform, exc)
