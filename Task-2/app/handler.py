from __future__ import annotations

import logging
from datetime import date as _date
from typing import Any

from app.config import settings
from app.models.discord_models import DiscordInteraction
from app.models.meal_models import MealRecord
from app.services import discord_service, headcount_service, meal_service, team_service

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _reply(content: str, ephemeral: bool = True) -> tuple[str, bool]:
    return content, ephemeral


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


def _handle_meal_status(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_user = _get_option(options, "user")
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to view another user's meal status.")
    else:
        target_user = user_id
    target_date = _get_option(options, "date") or str(_date.today())
    record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
    if not record.meal_opt_in:
        status = "opted out (all meals)"
    elif record.opted_out_meals:
        status = f"opted out of: {', '.join(record.opted_out_meals)}"
    else:
        status = "opted in (all meals)"
    label = f"<@{target_user}>" if target_user != user_id else "You"
    return _reply(f"**{target_date}** — {label}: {status} | Location: {record.work_location}")


def _collect_meal_types(options: list) -> list[str] | None:
    """Collect selected meal type booleans. Returns None if none selected (means all)."""
    selected = [mt.upper() for mt in ("lunch", "snacks", "iftar", "event_dinner", "optional_dinner") if _get_option(options, mt)]
    return selected or None


def _handle_meal_set(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    if not target_date:
        return _reply("Please provide a date.")
    target_user = _get_option(options, "user")
    bypass = False
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to update another user's meal record.")
        bypass = True
    else:
        target_user = user_id
    opt_in_val = _get_option(options, "opt_in")
    meal_types = _collect_meal_types(options)
    if opt_in_val is not None:
        fn = meal_service.opt_in if opt_in_val else meal_service.opt_out
        return _reply(fn(target_date, target_user, updated_by=user_id, meal_types=meal_types, bypass_cutoff=bypass))
    if meal_types:
        return _reply(meal_service.opt_out(target_date, target_user, updated_by=user_id, meal_types=meal_types, bypass_cutoff=bypass))
    return _reply("Nothing to update.")



def _handle_meal_bulk(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    start_date = _get_option(options, "start_date")
    end_date = _get_option(options, "end_date")
    opt_in_val = _get_option(options, "opt_in")
    if not start_date or not end_date or opt_in_val is None:
        return _reply("Please provide start_date, end_date, and opt_in.")
    target_user = _get_option(options, "user")
    bypass = False
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to bulk-update another user's meal records.")
        bypass = True
    else:
        target_user = user_id
    return _reply(meal_service.bulk_meal_update(start_date, end_date, opt_in_val, target_user, updated_by=user_id, bypass_cutoff=bypass))


def _handle_location_status(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_user = _get_option(options, "user")
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to view another user's location.")
    else:
        target_user = user_id
    target_date = _get_option(options, "date") or str(_date.today())
    record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
    label = f"<@{target_user}>" if target_user != user_id else "You"
    return _reply(f"**{target_date}** — {label}: {record.work_location}")


def _handle_work_location(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    location = _get_option(options, "location")
    if not target_date or not location:
        return _reply("Please provide both date and location.")
    target_user = _get_option(options, "user")
    bypass = False
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to update another user's location.")
        bypass = True
    else:
        target_user = user_id
    return _reply(meal_service.update_location(target_date, target_user, location, updated_by=user_id, bypass_cutoff=bypass))


def _handle_location_bulk(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    start_date = _get_option(options, "start_date")
    end_date = _get_option(options, "end_date")
    location = _get_option(options, "location")
    if not start_date or not end_date or not location:
        return _reply("Please provide start_date, end_date, and location.")
    target_user = _get_option(options, "user")
    bypass = False
    if target_user and target_user != user_id:
        if not _is_team_lead(interaction):
            return _reply("You do not have permission to bulk-update another user's location records.")
        bypass = True
    else:
        target_user = user_id
    return _reply(meal_service.bulk_location_update(start_date, end_date, location, target_user, updated_by=user_id, bypass_cutoff=bypass))


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


def _handle_meal(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
    handler_fn = _MEAL_HANDLERS.get(subcommand)
    if not handler_fn:
        return _reply("Unknown subcommand.")
    return handler_fn(interaction, options)


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


def _handle_headcount(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    target_user = _get_option(options, "user")

    if _is_admin(interaction) or _is_team_lead(interaction):
        if target_user:
            # Show a specific user's record for the given date
            if not target_date:
                return _reply("Please provide a date when specifying a user.")
            record = meal_service.get_record(target_date, target_user) or MealRecord(date=target_date, user_id=target_user)
            if not record.meal_opt_in:
                status = "opted out (all meals)"
            elif record.opted_out_meals:
                status = f"opted out of: {', '.join(record.opted_out_meals)}"
            else:
                status = "opted in (all meals)"
            return _reply(f"**{target_date}** — <@{target_user}>: {status} | Location: {record.work_location}")

        if target_date:
            if _is_admin(interaction):
                summary = headcount_service.daily_summary(target_date)
                return _reply(_format_headcount_summary(summary, f"Org-wide Headcount for {target_date}"))
            # Team Lead: scope to their team
            team = team_service.get_user_team(user_id)
            if not team:
                return _reply("You are not assigned to any team. Ask an Admin to add you to a team.")
            member_ids = team_service.get_team_members(team["team_id"])
            summary = headcount_service.team_summary(target_date, member_ids)
            return _reply(_format_headcount_summary(summary, f"Team **{team['name']}** Headcount for {target_date}"))
        # No date and no user — fall through to employee 30-day history

    # Employee: own history
    if target_user and target_user != user_id:
        return _reply("You do not have permission to view another user's headcount.")

    if target_date:
        record = meal_service.get_record(target_date, user_id) or MealRecord(date=target_date, user_id=user_id)
        if not record.meal_opt_in:
            status = "opted out (all meals)"
        elif record.opted_out_meals:
            status = f"opted out of: {', '.join(record.opted_out_meals)}"
        else:
            status = "opted in (all meals)"
        return _reply(f"**{target_date}** — Meal: {status} | Location: {record.work_location}")

    # 30-day rolling history
    from datetime import timedelta
    cutoff = str(_date.today() - timedelta(days=30))
    records = sorted(
        [r for r in meal_service.get_user_history(user_id) if r.date >= cutoff],
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


def _handle_event(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
    if subcommand == "list":
        events = meal_service.list_events_from_db()
        if not events:
            return _reply("No event days are currently configured.")
        lines = ["**Configured Event Days**"]
        for e in events:
            lines.append(f"  `{e['date']}` — {e.get('description', '(no description)')}")
        return _reply("\n".join(lines))

    if subcommand == "optout":
        user_id = interaction.get_user().id
        target_date = _get_option(options, "date")
        if not target_date:
            return _reply("Please provide a date.")
        if not meal_service.is_event_day(target_date):
            return _reply(f"{target_date} is not a configured event day. Use `/meal set` to change your meal preference.")
        return _reply(meal_service.opt_out(target_date, user_id, updated_by=user_id))

    if not _is_admin(interaction):
        return _reply("You do not have permission to use this command.")

    target_date = _get_option(options, "date")
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
        if settings.announcement_channel_id:
            try:
                discord_service.send_channel_message(settings.announcement_channel_id, message)
            except Exception as exc:
                logger.error("Failed to post event announcement to channel: %s", exc)
            return _reply(f"Announcement posted to <#{settings.announcement_channel_id}>.")
        return _reply(message, ephemeral=False)

    if subcommand == "update":
        description = _get_option(options, "description") or ""
        return _reply(meal_service.update_event(target_date, description, set_by=interaction.get_user().id))

    if subcommand == "delete":
        return _reply(meal_service.delete_event(target_date))

    return _reply("Unknown subcommand.")


def _handle_wfh_periods(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
    if subcommand == "list":
        periods = meal_service.list_wfh_periods()
        if not periods:
            return _reply("No company-wide WFH periods scheduled in the next 2 months.")
        lines = ["**Upcoming WFH Periods**"]
        for p in periods:
            lines.append(f"  {p['start_date']} → {p['end_date']}")
        return _reply("\n".join(lines))

    if not _is_admin(interaction):
        return _reply("You do not have permission to manage WFH periods.")

    start_date = _get_option(options, "start_date")
    end_date = _get_option(options, "end_date")
    if not start_date or not end_date:
        return _reply("Please provide both start_date and end_date.")

    user_id = interaction.get_user().id
    if subcommand == "set":
        return _reply(meal_service.set_wfh_period(start_date, end_date, set_by=user_id))
    if subcommand == "delete":
        return _reply(meal_service.delete_wfh_period(start_date, end_date))
    return _reply("Unknown subcommand.")


def _handle_meal_type(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
    if subcommand == "list":
        target_date = _get_option(options, "date") or str(_date.today())
        active = meal_service.get_active_meal_types(target_date)
        if not active:
            return _reply(f"No active meal types for **{target_date}**.")
        labels = [_MEAL_TYPE_LABELS.get(mt, mt) for mt in active]
        return _reply(f"**Active meal types for {target_date}:** {', '.join(labels)}")

    if not _is_admin(interaction):
        return _reply("You do not have permission to use this command.")

    target_date = _get_option(options, "date")
    meal_type = _get_option(options, "meal_type")
    if not target_date or not meal_type:
        return _reply("Please provide both date and meal_type.")

    user_id = interaction.get_user().id
    if subcommand == "activate":
        return _reply(meal_service.activate_meal_type(target_date, meal_type, set_by=user_id))
    if subcommand == "deactivate":
        return _reply(meal_service.deactivate_meal_type(target_date, meal_type))
    return _reply("Unknown subcommand.")


def _handle_team_members(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    if not _is_team_lead(interaction):
        return _reply("You do not have permission to use this command.")

    user_id = interaction.get_user().id
    team_id = _get_option(options, "team_id")

    # Admin with no team_id — list all teams
    if not team_id and _is_admin(interaction):
        teams = team_service.list_teams()
        if not teams:
            return _reply("No teams configured.")
        lines = ["**All Teams**"]
        for t in teams:
            count = len(team_service.get_team_members(t["team_id"]))
            lines.append(f"  `{t['team_id']}` — **{t['name']}** | Lead: <@{t['lead_user_id']}> | {count} member(s)")
        return _reply("\n".join(lines))

    if team_id:
        if not _is_admin(interaction):
            return _reply("Only Admins can specify a team. Team Leads see their own team.")
        team = team_service.get_team(team_id)
    else:
        team = team_service.get_user_team(user_id)

    if not team:
        return _reply("Team not found." if team_id else "You are not assigned to any team.")

    members = team_service.get_team_members(team["team_id"])
    month_prefix = str(_date.today())[:7]
    try:
        wfh_summary = meal_service.get_monthly_wfh_summary(month_prefix)
    except RuntimeError:
        return _reply("Failed to retrieve WFH data. Please try again later.")
    member_lines = "\n".join(
        f"  <@{uid}> — WFH this month: {wfh_summary.get(uid, 0)}"
        for uid in members
    ) or "  (no members)"
    return _reply(
        f"**{team['name']}** (`{team['team_id']}`) — Lead: <@{team['lead_user_id']}>\n"
        f"Members ({len(members)}) — {month_prefix}:\n{member_lines}"
    )


def _route_command(interaction: DiscordInteraction) -> tuple[str, bool]:
    if not interaction.data:
        return _reply("No interaction data.")

    command = interaction.data.name
    options = interaction.data.options

    subcommand = None
    sub_options: list = []
    if options and options[0].type == 1:
        subcommand = options[0].name
        sub_options = options[0].options

    if command == "meal":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_meal(interaction, subcommand, sub_options)

    if command == "location":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        handler_fn = _LOCATION_HANDLERS.get(subcommand)
        if not handler_fn:
            return _reply("Unknown subcommand.")
        return handler_fn(interaction, sub_options)

    if command == "headcount":
        return _handle_headcount(interaction, options)

    if command == "team-members":
        return _handle_team_members(interaction, options)

    if command == "wfh-periods":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_wfh_periods(interaction, subcommand, sub_options)

    if command == "event":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_event(interaction, subcommand, sub_options)

    if command == "meal-type":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_meal_type(interaction, subcommand, sub_options)

    return _reply("Unknown command.")


def handler(event: dict, context: Any) -> None:
    try:
        interaction = DiscordInteraction(**event)
    except Exception as exc:
        logger.error("Failed to parse interaction payload: %s", exc)
        return

    try:
        content, ephemeral = _route_command(interaction)
    except Exception as exc:
        logger.error("Unhandled error routing command: %s", exc)
        content, ephemeral = "An unexpected error occurred. Please try again.", True

    try:
        discord_service.send_followup(interaction.token, content, ephemeral=ephemeral)
    except Exception as exc:
        logger.error("Failed to send follow-up to Discord: %s", exc)
