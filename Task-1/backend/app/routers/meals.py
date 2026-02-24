import json
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, MealType, MealRecord, UserRole, UserStatus, SpecialDayType
from app.audit_service import log_audit


router = APIRouter(prefix="/api/meals", tags=["meals"])

storage = JSONStorage()


def get_todays_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_cutoff_time() -> tuple[int, int]:
    """Get the configured cutoff hour and minute from settings."""
    settings = storage.read_settings()
    return settings.get("cutoff_hour", 21), settings.get("cutoff_minute", 0)


def is_cutoff_passed(target_date: str) -> bool:
    """
    Check if cutoff time has passed for the target date.
    - Past dates and today: always locked.
    - Tomorrow: locked after configured cutoff time.
    - Further future: open.
    """
    now = datetime.now()
    target = datetime.strptime(target_date, "%Y-%m-%d").date()
    today = now.date()
    tomorrow = today + timedelta(days=1)

    if target <= today:
        return True

    if target == tomorrow:
        cutoff_hour, cutoff_minute = get_cutoff_time()
        if cutoff_hour == 0 and cutoff_minute == 0:
            return False
        cutoff = now.replace(hour=cutoff_hour, minute=cutoff_minute, second=0, microsecond=0)
        return now >= cutoff

    return False


def get_schedule_forward_days() -> int:
    return storage.read_settings().get("schedule_forward_days", 14)


def is_within_schedule_window(target_date: str) -> bool:
    """Return True if target_date is within today + schedule_forward_days (from settings)."""
    today = datetime.now().date()
    target = datetime.strptime(target_date, "%Y-%m-%d").date()
    max_date = today + timedelta(days=get_schedule_forward_days())
    return today <= target <= max_date


def create_default_participation(user_id: int, date: str) -> MealRecord:
    return MealRecord(
        user_id=user_id,
        date=date,
        meals={
            MealType.LUNCH.value: True,
            MealType.SNACKS.value: True,
            MealType.IFTAR.value: True,
            MealType.EVENT_DINNER.value: True,
            MealType.OPTIONAL_DINNER.value: True,
        }
    )


class ParticipationUpdate(BaseModel):
    meals: Dict[str, bool]
    date: str = None
    target_user_id: Optional[int] = None


def get_tomorrows_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


@router.get("/today", response_model=MealRecord)
async def get_todays_participation(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to tomorrow)"),
    current_user: User = Depends(get_current_user)
):
    """Get meal participation for a date. Defaults to tomorrow if no date provided."""
    if current_user.status != UserStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not yet approved"
        )

    target_date = date if date else get_tomorrows_date()

    participation_data = storage.read_participation()

    existing_record = None
    for record in participation_data:
        if record.get("user_id") == current_user.id and record.get("date") == target_date:
            existing_record = record
            break

    if existing_record:
        return MealRecord(**existing_record)

    new_record = create_default_participation(current_user.id, target_date)
    new_record_dict = new_record.model_dump()

    participation_data.append(new_record_dict)
    storage.write_participation(participation_data)

    return new_record


@router.put("/participation", response_model=MealRecord)
async def update_participation(
    update_data: ParticipationUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.status != UserStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not yet approved"
        )

    target_date = update_data.date if update_data.date else get_tomorrows_date()

    is_privileged = current_user.role in [UserRole.ADMIN.value, UserRole.LOGISTICS.value, UserRole.TEAM_LEAD.value]

    # Resolve the user whose record will be updated
    if update_data.target_user_id and update_data.target_user_id != current_user.id:
        if not is_privileged:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update another user's meal preferences"
            )
        # Verify target user exists and is approved
        all_users = storage.read_users()
        target_user = next(
            (u for u in all_users if u.get("id") == update_data.target_user_id),
            None
        )
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found"
            )
        if target_user.get("status") != UserStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user account is not approved"
            )
        effective_user_id = update_data.target_user_id
    else:
        effective_user_id = current_user.id

    # Enforce scheduling window for non-privileged users
    if not is_privileged and not is_within_schedule_window(target_date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You can only update meal preferences within {get_schedule_forward_days()} days from today"
        )

    # Block updates on special days (not for Admin/Logistics/TeamLead)
    if not is_privileged:
        special_days = storage.read_special_days()
        for sd in special_days:
            if sd.get("date") == target_date:
                sd_type = sd.get("type", "Closed")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot update meal preferences for a {sd_type} day"
                )

    # Cutoff only applies to Employees updating their own record
    if current_user.role == UserRole.EMPLOYEE.value:
        if is_cutoff_passed(target_date):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cutoff time has passed ({get_cutoff_time()[0]}:{get_cutoff_time()[1]:02d}). You can no longer update meal preferences for this date."
            )

    participation_data = storage.read_participation()

    record_index = None
    for i, record in enumerate(participation_data):
        if record.get("user_id") == effective_user_id and record.get("date") == target_date:
            record_index = i
            break

    if record_index is None:
        new_record = create_default_participation(effective_user_id, target_date)
        new_record_dict = new_record.model_dump()
        participation_data.append(new_record_dict)
        record_index = len(participation_data) - 1

    valid_meal_types = {mt.value for mt in MealType}
    for meal_type in update_data.meals.keys():
        if meal_type not in valid_meal_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid meal type: {meal_type}. Valid types are: {', '.join(valid_meal_types)}"
            )

    participation_data[record_index]["meals"].update(update_data.meals)

    storage.write_participation(participation_data)

    # Audit log
    log_audit(
        actor_user_id=current_user.id,
        target_user_id=effective_user_id,
        action_type="meal_update",
        new_value=json.dumps(update_data.meals),
        date=target_date,
    )

    return MealRecord(**participation_data[record_index])
