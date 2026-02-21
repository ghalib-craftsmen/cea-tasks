from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, MealType, MealRecord


router = APIRouter(prefix="/api/admin", tags=["admin"])

storage = JSONStorage()


def get_todays_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


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


class UserParticipation(BaseModel):
    user_id: int
    username: str
    name: str
    email: str
    role: UserRole
    team_id: Optional[int] = None
    date: str
    meals: Dict[str, bool]
    
    class Config:
        use_enum_values = True


class ParticipationUpdateRequest(BaseModel):
    target_user_id: int
    meals: Dict[str, bool]


async def require_admin_or_teamlead_or_logistics(
    current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.TEAM_LEAD.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with Admin, TeamLead, or Logistics role can perform this action"
        )
    return current_user


async def require_admin_or_logistics(
    current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with Admin or Logistics role can perform this action"
        )
    return current_user


@router.get("/participation", response_model=List[UserParticipation])
async def get_all_participation(
    team_id: Optional[int] = Query(None, description="Filter by team ID (Admin only)"),
    current_user: User = Depends(require_admin_or_teamlead_or_logistics)):
    today = get_todays_date()
    
    users_data = storage.read_users()
    participation_data = storage.read_participation()
    
    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == today:
            participation_lookup[record.get("user_id")] = record
    
    result = []
    
    for user_dict in users_data:
        user = User(**user_dict)

        if current_user.role == UserRole.TEAM_LEAD.value:
            if user.team_id != current_user.team_id:
                continue
        elif current_user.role == UserRole.ADMIN.value and team_id is not None:
            if user.team_id != team_id:
                continue
        
        participation_record = participation_lookup.get(user.id)
        if participation_record:
            meals = participation_record.get("meals", {})
        else:
            default_record = create_default_participation(user.id, today)
            meals = default_record.meals
        
        result.append(UserParticipation(
            user_id=user.id,
            username=user.username,
            name=user.name,
            email=user.email,
            role=user.role,
            team_id=user.team_id,
            date=today,
            meals=meals
        ))
    
    return result


@router.put("/participation", response_model=UserParticipation)
async def update_user_participation(
    update_data: ParticipationUpdateRequest,
    current_user: User = Depends(get_current_user)):
    
    today = get_todays_date()
    
    users_data = storage.read_users()
    participation_data = storage.read_participation()
    
    target_user_dict = None
    for user_dict in users_data:
        if user_dict.get("id") == update_data.target_user_id:
            target_user_dict = user_dict
            break
    
    if target_user_dict is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {update_data.target_user_id} not found"
        )
    
    target_user = User(**target_user_dict)
    
    if current_user.role == UserRole.TEAM_LEAD.value:
        if target_user.team_id != current_user.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TeamLead can only update users in their team"
            )
    elif current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Logistics, or TeamLead (for team members) can update participation"
        )
    
    valid_meal_types = {mt.value for mt in MealType}
    for meal_type in update_data.meals.keys():
        if meal_type not in valid_meal_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid meal type: {meal_type}. Valid types are: {', '.join(valid_meal_types)}"
            )
    
    record_index = None
    for i, record in enumerate(participation_data):
        if record.get("user_id") == update_data.target_user_id and record.get("date") == today:
            record_index = i
            break
    
    if record_index is None:
        new_record = create_default_participation(update_data.target_user_id, today)
        new_record_dict = new_record.model_dump()
        participation_data.append(new_record_dict)
        record_index = len(participation_data) - 1
    
    participation_data[record_index]["meals"].update(update_data.meals)
    
    storage.write_participation(participation_data)
    
    updated_record = participation_data[record_index]
    
    return UserParticipation(
        user_id=target_user.id,
        username=target_user.username,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role,
        team_id=target_user.team_id,
        date=today,
        meals=updated_record["meals"]
    )

