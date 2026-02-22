from datetime import datetime, timedelta
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, MealType, MealRecord, UserRole, UserStatus


router = APIRouter(prefix="/api/meals", tags=["meals"])

storage = JSONStorage()


def get_todays_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def is_cutoff_passed(target_date: str) -> bool:
    """
    Check if cutoff time has passed for the target date.
    Cutoff is 9:00 PM the previous day.
    - For today's meals: cutoff was yesterday 9 PM (always passed).
    - For tomorrow's meals: cutoff is today 9 PM.
    - For past dates: always locked.
    """
    now = datetime.now()
    target = datetime.strptime(target_date, "%Y-%m-%d").date()
    today = now.date()
    tomorrow = today + timedelta(days=1)

    # Past dates and today are always locked (cutoff already passed)
    if target <= today:
        return True

    # Tomorrow's meals: cutoff is today at 9 PM
    if target == tomorrow:
        cutoff_time = datetime.strptime("21:00", "%H:%M").time()
        return now.time() >= cutoff_time

    # Future dates beyond tomorrow are open
    return False


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


def get_tomorrows_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


@router.get("/today", response_model=MealRecord)
async def get_todays_participation(current_user: User = Depends(get_current_user)):
    """Get meal participation. Employees see tomorrow's preferences; Admin/Logistics/TeamLead see today's."""
    if current_user.status != UserStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not yet approved"
        )

    # Employees set preferences for tomorrow; others view today
    if current_user.role == UserRole.EMPLOYEE.value:
        target_date = get_tomorrows_date()
    else:
        target_date = get_todays_date()

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

    # Employees default to tomorrow; Admin/Logistics/TeamLead default to today
    if update_data.date:
        target_date = update_data.date
    elif current_user.role == UserRole.EMPLOYEE.value:
        target_date = get_tomorrows_date()
    else:
        target_date = get_todays_date()

    # Cutoff only applies to Employees
    if current_user.role == UserRole.EMPLOYEE.value:
        if is_cutoff_passed(target_date):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cutoff time has passed (9:00 PM). You can no longer update tomorrow's meal preferences."
            )
    
    participation_data = storage.read_participation()
    
    record_index = None
    for i, record in enumerate(participation_data):
        if record.get("user_id") == current_user.id and record.get("date") == target_date:
            record_index = i
            break
    
    if record_index is None:
        new_record = create_default_participation(current_user.id, target_date)
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
    
    return MealRecord(**participation_data[record_index])
