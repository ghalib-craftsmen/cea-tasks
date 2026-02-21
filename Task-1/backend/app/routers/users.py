from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, UserResponse, Team


router = APIRouter(prefix="/api", tags=["users"])

storage = JSONStorage()


async def require_admin_or_teamlead_or_logistics(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.TEAM_LEAD.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with Admin, TeamLead, or Logistics role can access this endpoint"
        )
    return current_user


def get_team_name(team_id: Optional[int]) -> Optional[str]:
    """Get team name by team_id."""
    if team_id is None:
        return None
    teams_data = storage.read_teams()
    for team_dict in teams_data:
        if team_dict.get("id") == team_id:
            return team_dict.get("name")
    return None


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information including team name."""
    team_name = get_team_name(current_user.team_id)
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        team_id=current_user.team_id,
        team_name=team_name
    )


@router.get("/teams", response_model=List[Team])
async def get_teams(current_user: User = Depends(require_admin_or_teamlead_or_logistics)):
    """Get all teams. Only accessible by Admin, TeamLead, or Logistics."""
    teams_data = storage.read_teams()
    return [Team(**team_dict) for team_dict in teams_data]
