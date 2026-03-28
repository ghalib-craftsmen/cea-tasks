from __future__ import annotations

from app.models.meal_models import MealRecord
from app.services.meal_service import get_active_meal_types, get_records_for_date, is_event_day


def _summarize(records: list[MealRecord], active_types: list[str]) -> dict:
    opted_in = [r for r in records if r.meal_opt_in]
    opted_out = [r for r in records if not r.meal_opt_in]

    # Office/WFH split counts all users regardless of opt-in status
    office = sum(1 for r in records if r.work_location == "OFFICE")
    wfh = sum(1 for r in records if r.work_location == "WFH")

    # Only include active meal types in the breakdown
    by_meal_type = {
        mt: sum(1 for r in opted_in if mt not in r.opted_out_meals)
        for mt in active_types
    }

    return {
        "total_opted_in": len(opted_in),
        "total_opted_out": len(opted_out),
        "office": office,
        "wfh": wfh,
        "by_meal_type": by_meal_type,
    }


def daily_summary(date: str) -> dict:
    """Org-wide headcount summary for a date."""
    records = get_records_for_date(date)
    active_types = get_active_meal_types(date)
    summary = _summarize(records, active_types)
    summary["date"] = date
    summary["is_event_day"] = is_event_day(date)
    return summary


def team_summary(date: str, team_user_ids: list[str]) -> dict:
    """Headcount summary filtered to a specific team's user IDs."""
    records = get_records_for_date(date)
    team_records = [r for r in records if r.user_id in team_user_ids]
    active_types = get_active_meal_types(date)
    summary = _summarize(team_records, active_types)
    summary["date"] = date
    summary["team_size"] = len(team_user_ids)
    return summary
