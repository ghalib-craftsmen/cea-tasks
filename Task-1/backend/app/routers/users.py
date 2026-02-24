import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import WFH_ALLOWANCE
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, UserResponse, Team, MealType, MealRecord, WorkLocationType
from app.audit_service import log_audit
from app.wfh_service import calculate_wfh_days_current_month


router = APIRouter(prefix="/api", tags=["users"])

storage = JSONStorage()


def get_todays_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def get_tomorrows_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


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


def get_user_location(user_id: int, date: str, work_locations: List[Dict], wfh_periods: List[Dict]) -> WorkLocationType:
    """Get user's location for a specific date."""
    for location in work_locations:
        if location.get("user_id") == user_id and location.get("date") == date:
            return WorkLocationType(location.get("location", "Office"))

    target_date = datetime.strptime(date, "%Y-%m-%d")
    for period in wfh_periods:
        start_date = datetime.strptime(period["start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(period["end_date"], "%Y-%m-%d")
        if start_date <= target_date <= end_date:
            return WorkLocationType.WFH

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
    date: Optional[str] = None


class BulkParticipationRequest(BaseModel):
    user_ids: List[int]
    date: str
    action: str  # "opt_in" or "opt_out"


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
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to tomorrow)"),
    team_id: Optional[int] = Query(None, description="Filter by team ID (Admin only)"),
    filter: Optional[str] = Query(None, description="Optional filter. Use 'over_limit' to return only employees who exceeded the monthly WFH allowance."),
    current_user: User = Depends(require_admin_or_teamlead_or_logistics)):
    """Get participation list for a date. Scoped: TeamLead sees own team only, Admin sees all."""
    target_date = date if date else get_tomorrows_date()

    users_data = storage.read_users()
    participation_data = storage.read_participation()
    work_locations_data = storage.read_work_locations()
    wfh_periods_data = storage.read_wfh_periods()

    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == target_date:
            participation_lookup[record.get("user_id")] = record

    # Pre-build WFH usage lookup once if needed (avoids re-scanning for every user)
    wfh_days_cache: Optional[Dict[int, int]] = None
    if filter == "over_limit":
        wfh_days_cache = {}
        for user_dict in users_data:
            uid = user_dict.get("id")
            if uid is not None:
                wfh_days_cache[uid] = calculate_wfh_days_current_month(uid, work_locations_data)

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

        if filter == "over_limit" and wfh_days_cache is not None:
            if wfh_days_cache.get(user.id, 0) <= WFH_ALLOWANCE:
                continue

        participation_record = participation_lookup.get(user.id)
        if participation_record:
            meals = participation_record.get("meals", {})
        else:
            default_record = create_default_participation(user.id, target_date)
            meals = default_record.meals

        location = get_user_location(user.id, target_date, work_locations_data, wfh_periods_data)

        result.append(UserParticipation(
            user_id=user.id,
            username=user.username,
            name=user.name,
            email=user.email,
            role=user.role,
            team_id=user.team_id,
            date=target_date,
            meals=meals,
            location=location
        ))

    return result


@router.put("/participation", response_model=UserParticipation)
async def update_user_participation(
    update_data: ParticipationUpdateRequest,
    current_user: User = Depends(require_admin_or_teamlead)):
    """Update someone's meals. Admin can update anyone, TeamLead only their team."""
    target_date = update_data.date if update_data.date else get_tomorrows_date()

    # Enforce scheduling window for TeamLead (Admin bypasses)
    if current_user.role == UserRole.TEAM_LEAD.value:
        if not is_within_schedule_window(target_date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only update meal preferences within {get_schedule_forward_days()} days from today"
            )

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

    valid_meal_types = {mt.value for mt in MealType}
    for meal_type in update_data.meals.keys():
        if meal_type not in valid_meal_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid meal type: {meal_type}. Valid types are: {', '.join(valid_meal_types)}"
            )

    record_index = None
    for i, record in enumerate(participation_data):
        if record.get("user_id") == update_data.target_user_id and record.get("date") == target_date:
            record_index = i
            break

    if record_index is None:
        new_record = create_default_participation(update_data.target_user_id, target_date)
        new_record_dict = new_record.model_dump()
        participation_data.append(new_record_dict)
        record_index = len(participation_data) - 1

    participation_data[record_index]["meals"].update(update_data.meals)

    storage.write_participation(participation_data)

    # Audit log
    log_audit(
        actor_user_id=current_user.id,
        target_user_id=update_data.target_user_id,
        action_type="meal_update",
        new_value=json.dumps(update_data.meals),
        date=target_date,
    )

    updated_record = participation_data[record_index]

    return UserParticipation(
        user_id=target_user.id,
        username=target_user.username,
        name=target_user.name,
        email=target_user.email,
        role=target_user.role,
        team_id=target_user.team_id,
        date=target_date,
        meals=updated_record["meals"]
    )


@router.post("/participation/bulk", status_code=status.HTTP_200_OK)
async def bulk_update_participation(
    update_data: BulkParticipationRequest,
    current_user: User = Depends(require_admin_or_teamlead)):
    """Bulk update all meal types for a list of users. TeamLead scope-validated."""

    if update_data.action not in ("opt_in", "opt_out"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be 'opt_in' or 'opt_out'"
        )

    # Enforce scheduling window for TeamLead
    if current_user.role == UserRole.TEAM_LEAD.value:
        if not is_within_schedule_window(update_data.date):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only update meal preferences within {get_schedule_forward_days()} days from today"
            )

    opted_in = update_data.action == "opt_in"
    all_meals = {mt.value: opted_in for mt in MealType}

    users_data = storage.read_users()
    participation_data = storage.read_participation()

    user_lookup: Dict[int, dict] = {
        u.get("id"): u for u in users_data
        if u.get("status") == UserStatus.APPROVED.value
    }

    for uid in update_data.user_ids:
        user_dict = user_lookup.get(uid)
        if user_dict is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {uid} not found"
            )
        if current_user.role == UserRole.TEAM_LEAD.value:
            if user_dict.get("team_id") != current_user.team_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="One or more users are outside your team scope"
                )

    for uid in update_data.user_ids:
        record_index = None
        for i, record in enumerate(participation_data):
            if record.get("user_id") == uid and record.get("date") == update_data.date:
                record_index = i
                break

        if record_index is None:
            new_record = {"user_id": uid, "date": update_data.date, "meals": dict(all_meals)}
            participation_data.append(new_record)
        else:
            participation_data[record_index]["meals"].update(all_meals)

        # Audit log per user
        log_audit(
            actor_user_id=current_user.id,
            target_user_id=uid,
            action_type=update_data.action,
            new_value=json.dumps(all_meals),
            date=update_data.date,
        )

    storage.write_participation(participation_data)
    return {"updated": len(update_data.user_ids), "action": update_data.action}


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

    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == today:
            participation_lookup[record.get("user_id")] = record

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

        lead_name = None
        for m in team_members:
            if m.get("id") == team_dict.get("leadId"):
                lead_name = m.get("name")
                break

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
