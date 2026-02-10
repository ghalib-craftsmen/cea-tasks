from datetime import datetime
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, MealType, MealRecord


router = APIRouter(prefix="/api/meals", tags=["meals"])

storage = JSONStorage()


def get_todays_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def create_default_participation(user_id: int, date: str) -> MealRecord:
    return MealRecord(
        user_id=user_id,
        date=date,
        meals={
            MealType.LUNCH: True,
            MealType.SNACKS: True,
            MealType.IFTAR: True,
            MealType.EVENT_DINNER: True,
            MealType.OPTIONAL_DINNER: True,
        }
    )


class ParticipationUpdate(BaseModel):
    meals: Dict[str, bool]


@router.get("/today", response_model=MealRecord)
async def get_todays_participation(current_user: User = Depends(get_current_user)):
    today = get_todays_date()
    
    # Read all participation records
    participation_data = storage.read_participation()
    
    # Find existing record for user and today
    existing_record = None
    for record in participation_data:
        if record.get("user_id") == current_user.id and record.get("date") == today:
            existing_record = record
            break
    
    if existing_record:
        return MealRecord(**existing_record)
    
    # No record exists for today - create default and persist
    new_record = create_default_participation(current_user.id, today)
    new_record_dict = new_record.model_dump()
    
    # Append to participation data and save
    participation_data.append(new_record_dict)
    storage.write_participation(participation_data)
    
    return new_record


@router.put("/participation", response_model=MealRecord)
async def update_participation(
    update_data: ParticipationUpdate,
    current_user: User = Depends(get_current_user)
):
    today = get_todays_date()
    
    # Read all participation records
    participation_data = storage.read_participation()
    
    # Find existing record for user and today
    record_index = None
    for i, record in enumerate(participation_data):
        if record.get("user_id") == current_user.id and record.get("date") == today:
            record_index = i
            break
    
    if record_index is None:
        # No record exists - create default and add to list
        new_record = create_default_participation(current_user.id, today)
        new_record_dict = new_record.model_dump()
        participation_data.append(new_record_dict)
        record_index = len(participation_data) - 1
    
    # Validate meal types in update data
    valid_meal_types = {mt.value for mt in MealType}
    for meal_type in update_data.meals.keys():
        if meal_type not in valid_meal_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid meal type: {meal_type}. Valid types are: {', '.join(valid_meal_types)}"
            )
    
    # Update the specific fields
    participation_data[record_index]["meals"].update(update_data.meals)
    
    # Persist changes
    storage.write_participation(participation_data)
    
    return MealRecord(**participation_data[record_index])
