from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import WFH_ALLOWANCE
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, MealType
from app.wfh_service import calculate_wfh_days_current_month


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
storage = JSONStorage()


class EventMealSummary(BaseModel):
    id: int
    date: str
    title: str
    description: Optional[str] = None


class DashboardSummary(BaseModel):
    today_date: str
    tomorrow_date: str
    today_headcount: int        
    tomorrow_forecast: int      
    total_employees: int
    upcoming_events: List[EventMealSummary]
    wfh_over_limit_count: int
    wfh_allowance: int


async def require_admin_or_logistics(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value, UserRole.TEAM_LEAD.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Logistics, or TeamLead can access the dashboard summary",
        )
    return current_user


def _count_lunch_opted_in(date: str, approved_user_ids: List[int], participation_data: List[dict]) -> int:
    """Count approved employees opted-in to Lunch on the given date."""
    lookup = {
        r["user_id"]: r
        for r in participation_data
        if r.get("date") == date
    }
    count = 0
    for uid in approved_user_ids:
        record = lookup.get(uid)
        if record:
            opted_in = record.get("meals", {}).get(MealType.LUNCH.value, False)
        else:
            opted_in = True  # default: opted in
        if opted_in:
            count += 1
    return count


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(current_user: User = Depends(require_admin_or_logistics),):
    """
    Operational dashboard summary for Admin / Logistics / TeamLead.

    Returns:
    - today_headcount: Lunch opt-in count for today (scoped for TeamLead).
    - tomorrow_forecast: Lunch opt-in count for tomorrow (scoped for TeamLead).
    - upcoming_events: Event meals from today onwards (next 30 days).
    - wfh_over_limit_count: Employees who exceeded the monthly WFH allowance.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    in_30_days = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    users_data = storage.read_users()
    participation_data = storage.read_participation()
    work_locations = storage.read_work_locations()
    event_meals_data = storage.read_event_meals()

    # Build approved user list — TeamLead scoped to their team
    approved_users = []
    for u in users_data:
        if u.get("status") != UserStatus.APPROVED.value:
            continue
        if current_user.role == UserRole.TEAM_LEAD.value:
            if u.get("team_id") != current_user.team_id:
                continue
        approved_users.append(u)

    approved_user_ids = [u["id"] for u in approved_users]

    today_headcount = _count_lunch_opted_in(today, approved_user_ids, participation_data)
    tomorrow_forecast = _count_lunch_opted_in(tomorrow, approved_user_ids, participation_data)

    # Upcoming event meals: today → +30 days, sorted by date
    upcoming_events = sorted(
        [
            EventMealSummary(
                id=e["id"],
                date=e["date"],
                title=e["title"],
                description=e.get("description"),
            )
            for e in event_meals_data
            if today <= e.get("date", "") <= in_30_days
        ],
        key=lambda x: x.date,
    )

    # WFH over-limit count (admin/logistics: all; teamlead: their team)
    wfh_over_limit_count = sum(
        1
        for u in approved_users
        if calculate_wfh_days_current_month(u["id"], work_locations) > WFH_ALLOWANCE
    )

    return DashboardSummary(
        today_date=today,
        tomorrow_date=tomorrow,
        today_headcount=today_headcount,
        tomorrow_forecast=tomorrow_forecast,
        total_employees=len(approved_users),
        upcoming_events=upcoming_events,
        wfh_over_limit_count=wfh_over_limit_count,
        wfh_allowance=WFH_ALLOWANCE,
    )
