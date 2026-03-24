from __future__ import annotations

import logging
from datetime import date as _date
from typing import Any

from app.config import settings
from app.models.discord_models import DiscordInteraction
from app.models.meal_models import MealRecord
from app.services import discord_service, headcount_service, meal_service

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
    target_date = _get_option(options, "date") or str(_date.today())
    record = meal_service.get_record(target_date, user_id) or MealRecord(date=target_date, user_id=user_id)
    status = "opted in" if record.meal_opt_in else "opted out"
    return _reply(f"**{target_date}** — {status} | Location: {record.work_location} | Meal: {record.meal_type}")


def _handle_meal_update(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    if not target_date:
        return _reply("Please provide a date.")
    opt_in_val = _get_option(options, "opt_in")
    meal_type = _get_option(options, "meal_type")
    msgs = []
    if opt_in_val is not None:
        fn = meal_service.opt_in if opt_in_val else meal_service.opt_out
        msgs.append(fn(target_date, user_id, updated_by=user_id))
    if meal_type:
        msgs.append(meal_service.update_meal_type(target_date, user_id, meal_type, updated_by=user_id))
    return _reply("\n".join(msgs) if msgs else "Nothing to update.")


def _handle_meal_location(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    location = _get_option(options, "location")
    if not target_date or not location:
        return _reply("Please provide both date and location.")
    return _reply(meal_service.update_location(target_date, user_id, location, updated_by=user_id))


def _handle_meal_optout(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    user_id = interaction.get_user().id
    target_date = _get_option(options, "date")
    if not target_date:
        return _reply("Please provide a date.")
    if not meal_service.is_event_day(target_date):
        return _reply(f"{target_date} is not an event day. Use `/meal update` or `/meal location` to change your meal preference.")
    return _reply(meal_service.opt_out(target_date, user_id, updated_by=user_id))


def _handle_meal_summary(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
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


def _handle_meal_summary_all(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
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


def _handle_meal_override(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
    if not _is_admin(interaction):
        return _reply("You do not have permission to use this command.")
    user_id = interaction.get_user().id
    target_user = _get_option(options, "user")
    target_date = _get_option(options, "date")
    if not target_user or not target_date:
        return _reply("Please provide both user and date.")
    opt_in_val = _get_option(options, "opt_in")
    location = _get_option(options, "location")
    meal_type = _get_option(options, "meal_type")
    msgs = []
    if opt_in_val is not None:
        fn = meal_service.opt_in if opt_in_val else meal_service.opt_out
        msgs.append(fn(target_date, target_user, updated_by=user_id, bypass_cutoff=True))
    if location:
        msgs.append(meal_service.update_location(target_date, target_user, location, updated_by=user_id, bypass_cutoff=True))
    if meal_type:
        msgs.append(meal_service.update_meal_type(target_date, target_user, meal_type, updated_by=user_id, bypass_cutoff=True))
    return _reply("\n".join(msgs) if msgs else "Nothing to update.")


def _handle_meal_event(interaction: DiscordInteraction, options: list) -> tuple[str, bool]:
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
    return _reply("Unknown action.")


_MEAL_HANDLERS = {
    "status":      _handle_meal_status,
    "update":      _handle_meal_update,
    "location":    _handle_meal_location,
    "optout":      _handle_meal_optout,
    "summary":     _handle_meal_summary,
    "summary-all": _handle_meal_summary_all,
    "override":    _handle_meal_override,
    "event":       _handle_meal_event,
}


def _handle_meal(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
    handler_fn = _MEAL_HANDLERS.get(subcommand)
    if not handler_fn:
        return _reply("Unknown subcommand.")
    return handler_fn(interaction, options)


def _handle_special_day(interaction: DiscordInteraction, subcommand: str, options: list) -> tuple[str, bool]:
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

    if command == "special-day":
        if not subcommand:
            return _reply("Please specify a subcommand.")
        return _handle_special_day(interaction, subcommand, sub_options)

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

    discord_service.send_followup(interaction.token, content, ephemeral=ephemeral)
