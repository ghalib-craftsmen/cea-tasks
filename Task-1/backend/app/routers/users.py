from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, UserResponse, Team, MealType, MealRecord, WorkLocationType


router = APIRouter(prefix="/api", tags=["users"])

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


def get_user_location(user_id: int, date: str, work_locations: List[Dict], wfh_periods: List[Dict]) -> WorkLocationType:
    """Get user's location for a specific date."""
    # Check for explicit record
    for location in work_locations:
        if location.get("user_id") == user_id and location.get("date") == date:
            return WorkLocationType(location.get("location", "Office"))
    
    # Check WFH periods
    target_date = datetime.strptime(date, "%Y-%m-%d")
    for period in wfh_periods:
        start_date = datetime.strptime(period["start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(period["end_date"], "%Y-%m-%d")
        if start_date <= target_date <= end_date:
            return WorkLocationType.WFH
    
    # Default to Office
    return WorkLocationType.OFFICE


class UserParticipation(BaseModel):
    user_id: int
    username: str
    name: str
    email: str
    role: UserRole
    team_id: Optional[int] = None
    location: Optional[WorkLocationType] = None
    date: str
    meals: Dict[str, bool]

    class Config:
        use_enum_values = True


class ParticipationUpdateRequest(BaseModel):
    target_user_id: int
    meals: Dict[str, bool]


async def require_admin_or_teamlead_or_logistics(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.TEAM_LEAD.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with Admin, TeamLead, or Logistics role can access this endpoint"
        )
    return current_user


async def require_admin_or_teamlead(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.TEAM_LEAD.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or TeamLead can perform this action"
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
    """Get current user profile: Name, Email, Team, Role."""
    team_name = get_team_name(current_user.team_id)

    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        team_id=current_user.team_id,
        team_name=team_name,
        status=current_user.status
    )


@router.get("/participation", response_model=List[UserParticipation])
async def get_all_participation(
    team_id: Optional[int] = Query(None, description="Filter by team ID (Admin only)"),
    current_user: User = Depends(require_admin_or_teamlead_or_logistics)):
    """Get participation list. Scoped: TeamLead sees own team only, Admin sees all (optional ?team_id= filter)."""
    today = get_todays_date()
    
    users_data = storage.read_users()
    participation_data = storage.read_participation()
    work_locations_data = storage.read_work_locations()
    wfh_periods_data = storage.read_wfh_periods()
    
    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == today:
            participation_lookup[record.get("user_id")] = record
    
    result = []
    
    for user_dict in users_data:
        user = User(**user_dict)
        
        if user.status != UserStatus.APPROVED.value:
            continue
        
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
        
        # Get user location
        location = get_user_location(user.id, today, work_locations_data, wfh_periods_data)
        
        result.append(UserParticipation(
            user_id=user.id,
            username=user.username,
            name=user.name,
            email=user.email,
            role=user.role,
            team_id=user.team_id,
            date=today,
            meals=meals,
            location=location
        ))
    
    return result


@router.put("/participation", response_model=UserParticipation)
async def update_user_participation(
    update_data: ParticipationUpdateRequest,
    current_user: User = Depends(require_admin_or_teamlead)):
    """Update someone's meals. Scoped: Admin can update anyone, TeamLead only their team. Logistics cannot update."""
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

    # TeamLead can only update users in their team
    if current_user.role == UserRole.TEAM_LEAD.value:
        if target_user.team_id != current_user.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TeamLead can only update users in their team"
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


class TeamMemberInfo(BaseModel):
    user_id: int
    username: str
    name: str
    role: str
    meals: Optional[Dict[str, bool]] = None

    class Config:
        use_enum_values = True


class TeamDetailResponse(BaseModel):
    id: int
    name: str
    leadId: int
    lead_name: Optional[str] = None
    member_count: int = 0
    members: Optional[List[TeamMemberInfo]] = None


@router.get("/teams", response_model=List[TeamDetailResponse])
async def get_teams(current_user: User = Depends(require_admin_or_teamlead_or_logistics)):
    """
    Get all teams with details.
    Admin/Logistics: see all teams with all members' meal status.
    TeamLead: see all teams but meal status only for their own team.
    """
    teams_data = storage.read_teams()
    users_data = storage.read_users()
    participation_data = storage.read_participation()
    today = get_todays_date()

    # Build participation lookup for today
    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == today:
            participation_lookup[record.get("user_id")] = record

    # Group approved users by team_id
    users_by_team: Dict[int, List[dict]] = {}
    for u in users_data:
        if u.get("status") != UserStatus.APPROVED.value:
            continue
        tid = u.get("team_id")
        if tid is not None:
            users_by_team.setdefault(tid, []).append(u)

    is_admin_or_logistics = current_user.role in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]

    result = []
    for team_dict in teams_data:
        team_id = team_dict["id"]
        team_members = users_by_team.get(team_id, [])

        # Find lead name
        lead_name = None
        for m in team_members:
            if m.get("id") == team_dict.get("leadId"):
                lead_name = m.get("name")
                break

        # Determine if we should include meal status for this team
        include_meals = is_admin_or_logistics or (
            current_user.role == UserRole.TEAM_LEAD.value and current_user.team_id == team_id
        )

        members_info = []
        for m in team_members:
            meals = None
            if include_meals:
                p_record = participation_lookup.get(m["id"])
                if p_record:
                    meals = p_record.get("meals", {})
                else:
                    default = create_default_participation(m["id"], today)
                    meals = default.meals

            members_info.append(TeamMemberInfo(
                user_id=m["id"],
                username=m["username"],
                name=m["name"],
                role=m.get("role", "Employee"),
                meals=meals
            ))

        result.append(TeamDetailResponse(
            id=team_id,
            name=team_dict["name"],
            leadId=team_dict.get("leadId", 0),
            lead_name=lead_name,
            member_count=len(team_members),
            members=members_info if include_meals else None
        ))

    return result
