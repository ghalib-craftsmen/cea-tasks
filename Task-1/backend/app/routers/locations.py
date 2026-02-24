from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.auth import get_current_user, require_admin
from app.db import JSONStorage
from app.models import (
    User,
    UserRole,
    WorkLocationType,
    WorkLocation,
    WorkLocationUpdate,
    WorkLocationResponse,
    WorkLocationAdminUpdate,
    WFHPeriod,
    WFHPeriodCreate,
    WFHPeriodResponse,
    SpecialDay,
    SpecialDayCreate,
    SpecialDayResponse,
    SpecialDayType,
    SpecialDayCheck,
)
from app.config import SCHEDULE_FORWARD_DAYS
from app.audit_service import log_audit


router = APIRouter(prefix="/api", tags=["locations"])
storage = JSONStorage()


def is_date_in_wfh_period(date: str, wfh_periods: List[Dict], user_team_id: Optional[int] = None) -> bool:
    """Check if a date falls within any WFH period for the user's team."""
    target_date = datetime.strptime(date, "%Y-%m-%d")
    for period in wfh_periods:
        period_team_id = period.get("team_id")
        if period_team_id is not None and user_team_id != period_team_id:
            continue
        start_date = datetime.strptime(period["start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(period["end_date"], "%Y-%m-%d")
        if start_date <= target_date <= end_date:
            return True
    return False


def get_user_location(user_id: int, date: str, user_team_id: Optional[int] = None) -> WorkLocationType:
    """
    Get user's location for a specific date.
    Priority: explicit record > WFH period > Office default.
    """
    work_locations = storage.read_work_locations()

    for location in work_locations:
        if location.get("user_id") == user_id and location.get("date") == date:
            return WorkLocationType(location.get("location", "Office"))

    wfh_periods = storage.read_wfh_periods()
    if is_date_in_wfh_period(date, wfh_periods, user_team_id):
        return WorkLocationType.WFH

    return WorkLocationType.OFFICE


def is_office_closed(date: str) -> bool:
    """Check if a date is marked as closed or is a weekend."""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        if target_date.weekday() in (5, 6):  # Saturday or Sunday
            return True
    except ValueError:
        pass

    special_days = storage.read_special_days()
    for special_day in special_days:
        if special_day.get("date") == date and special_day.get("type") == SpecialDayType.CLOSED.value:
            return True
    return False


def is_within_schedule_window(target_date: str) -> bool:
    """Return True if target_date is within today + SCHEDULE_FORWARD_DAYS."""
    today = datetime.now().date()
    target = datetime.strptime(target_date, "%Y-%m-%d").date()
    max_date = today + timedelta(days=SCHEDULE_FORWARD_DAYS)
    return today <= target <= max_date


async def require_admin_or_logistics(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require Admin or Logistics role."""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Logistics role can access this endpoint"
        )
    return current_user


# Work Location Endpoints


@router.get("/me/location", response_model=WorkLocationResponse)
async def get_my_location(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user)
):
    """Get current user's location for a specific date."""
    location = get_user_location(current_user.id, date, current_user.team_id)
    return WorkLocationResponse(
        user_id=current_user.id,
        date=date,
        location=location
    )


@router.put("/me/location", response_model=WorkLocationResponse)
async def update_my_location(
    request: WorkLocationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's location for a specific date."""
    # Enforce scheduling window
    if not is_within_schedule_window(request.date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can only update location within {SCHEDULE_FORWARD_DAYS} days from today"
        )

    if is_office_closed(request.date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update location for a closed office date"
        )

    work_locations = storage.read_work_locations()

    updated = False
    for location in work_locations:
        if location.get("user_id") == current_user.id and location.get("date") == request.date:
            location["location"] = request.location
            updated = True
            break

    if not updated:
        work_locations.append({
            "user_id": current_user.id,
            "date": request.date,
            "location": request.location
        })

    storage.write_work_locations(work_locations)

    # Audit log
    log_audit(
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        action_type="location_change",
        new_value=request.location if isinstance(request.location, str) else request.location.value,
        date=request.date,
    )

    return WorkLocationResponse(
        user_id=current_user.id,
        date=request.date,
        location=request.location
    )


@router.put("/work-location", response_model=WorkLocationResponse)
async def update_user_location(
    request: WorkLocationAdminUpdate,
    current_user: User = Depends(get_current_user)
):
    """
    Update a user's location for a specific date.
    - Admin: can update any user, bypasses scheduling window.
    - Team Lead: can only update users on their own team, subject to scheduling window.
    - Logistics: Forbidden (403).
    """
    if current_user.role == UserRole.LOGISTICS.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Logistics role cannot modify user locations"
        )

    # Enforce scheduling window for TeamLead
    if current_user.role == UserRole.TEAM_LEAD.value:
        if not is_within_schedule_window(request.date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only update location within {SCHEDULE_FORWARD_DAYS} days from today"
            )

    if is_office_closed(request.date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update location for a closed office date"
        )

    users_data = storage.read_users()
    target_user = None
    for user in users_data:
        if user.get("id") == request.user_id:
            target_user = user
            break

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role == UserRole.TEAM_LEAD.value:
        if target_user.get("team_id") != current_user.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Team Lead can only update locations for users on their own team"
            )

    work_locations = storage.read_work_locations()

    updated = False
    for location in work_locations:
        if location.get("user_id") == request.user_id and location.get("date") == request.date:
            location["location"] = request.location
            updated = True
            break

    if not updated:
        work_locations.append({
            "user_id": request.user_id,
            "date": request.date,
            "location": request.location
        })

    storage.write_work_locations(work_locations)

    # Audit log
    log_audit(
        actor_user_id=current_user.id,
        target_user_id=request.user_id,
        action_type="location_change",
        new_value=request.location if isinstance(request.location, str) else request.location.value,
        date=request.date,
    )

    return WorkLocationResponse(
        user_id=request.user_id,
        date=request.date,
        location=request.location
    )


# WFH Period Endpoints


@router.get("/wfh-periods", response_model=List[WFHPeriodResponse])
async def get_wfh_periods(current_user: User = Depends(require_admin_or_logistics)):
    """Get all WFH periods. Access: Admin, Logistics."""
    wfh_periods = storage.read_wfh_periods()
    return [
        WFHPeriodResponse(
            id=period.get("id"),
            start_date=period.get("start_date"),
            end_date=period.get("end_date"),
            team_id=period.get("team_id")
        )
        for period in wfh_periods
    ]


@router.post("/wfh-periods", response_model=WFHPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_wfh_period(
    request: WFHPeriodCreate,
    current_user: User = Depends(require_admin_or_logistics)
):
    """Create a new WFH period. Access: Admin, Logistics."""
    wfh_periods = storage.read_wfh_periods()

    start_date = datetime.strptime(request.start_date, "%Y-%m-%d")
    end_date = datetime.strptime(request.end_date, "%Y-%m-%d")

    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before or equal to end date"
        )

    new_id = max((period.get("id", 0) for period in wfh_periods), default=0) + 1

    new_period = {
        "id": new_id,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "team_id": request.team_id
    }

    wfh_periods.append(new_period)
    storage.write_wfh_periods(wfh_periods)

    return WFHPeriodResponse(
        id=new_id,
        start_date=request.start_date,
        end_date=request.end_date,
        team_id=request.team_id
    )


@router.delete("/wfh-periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wfh_period(
    period_id: int,
    current_user: User = Depends(require_admin_or_logistics)
):
    """Delete a WFH period by ID. Access: Admin, Logistics."""
    wfh_periods = storage.read_wfh_periods()

    updated_periods = [p for p in wfh_periods if p.get("id") != period_id]

    if len(updated_periods) == len(wfh_periods):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="WFH period not found"
        )

    storage.write_wfh_periods(updated_periods)
    return None


# Special Days Endpoints


@router.get("/special-days", response_model=List[SpecialDayResponse])
async def get_special_days(current_user: User = Depends(get_current_user)):
    """Get all special days. Access: All authenticated users."""
    special_days = storage.read_special_days()
    return [
        SpecialDayResponse(
            id=day.get("id"),
            date=day.get("date"),
            type=day.get("type"),
            note=day.get("note")
        )
        for day in special_days
    ]


@router.post("/special-days", response_model=SpecialDayResponse, status_code=status.HTTP_201_CREATED)
async def create_special_day(
    request: SpecialDayCreate,
    current_user: User = Depends(require_admin_or_logistics)
):
    """Create a new special day. Access: Admin, Logistics."""
    special_days = storage.read_special_days()

    new_id = max((day.get("id", 0) for day in special_days), default=0) + 1

    new_day = {
        "id": new_id,
        "date": request.date,
        "type": request.type,
        "note": request.note
    }

    special_days.append(new_day)
    storage.write_special_days(special_days)

    return SpecialDayResponse(
        id=new_id,
        date=request.date,
        type=request.type,
        note=request.note
    )


@router.delete("/special-days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_special_day(
    day_id: int,
    current_user: User = Depends(require_admin_or_logistics)
):
    """Delete a special day by ID. Access: Admin, Logistics."""
    special_days = storage.read_special_days()

    updated_days = [d for d in special_days if d.get("id") != day_id]

    if len(updated_days) == len(special_days):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Special day not found"
        )

    storage.write_special_days(updated_days)
    return None


@router.get("/special-days/check", response_model=SpecialDayCheck)
async def check_special_day(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user)
):
    """Check if a date is a special day."""
    special_days = storage.read_special_days()

    for special_day in special_days:
        if special_day.get("date") == date:
            return SpecialDayCheck(
                date=date,
                is_closed=special_day.get("type") == SpecialDayType.CLOSED.value,
                type=special_day.get("type"),
                note=special_day.get("note")
            )

    return SpecialDayCheck(date=date, is_closed=False, type=None, note=None)
