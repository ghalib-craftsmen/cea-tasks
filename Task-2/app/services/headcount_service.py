from __future__ import annotations

from app.models.meal_models import MealRecord
from app.services.meal_service import get_records_for_date, is_event_day


def _summarize(records: list[MealRecord]) -> dict:
    opted_in = [r for r in records if r.meal_opt_in]
    opted_out = [r for r in records if not r.meal_opt_in]
    office = [r for r in opted_in if r.work_location == "OFFICE"]
    wfh = [r for r in opted_in if r.work_location == "WFH"]

    return {
        "total_opted_in": len(opted_in),
        "total_opted_out": len(opted_out),
        "office": len(office),
        "wfh": len(wfh),
    }


def daily_summary(date: str) -> dict:
    """Org-wide headcount summary for a date."""
    records = get_records_for_date(date)
    summary = _summarize(records)
    summary["date"] = date
    summary["is_event_day"] = is_event_day(date)
    return summary


def team_summary(date: str, team_user_ids: list[str]) -> dict:
    """Headcount summary filtered to a specific team's user IDs."""
    records = get_records_for_date(date)
    team_records = [r for r in records if r.user_id in team_user_ids]
    summary = _summarize(team_records)
    summary["date"] = date
    summary["team_size"] = len(team_user_ids)
    return summary
