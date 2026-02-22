from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, MealType, WorkLocationType


router = APIRouter(prefix="/api/headcount", tags=["headcount"])

storage = JSONStorage()


def get_tomorrows_date() -> str:
    return (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")


async def require_admin_logistics_or_teamlead(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value, UserRole.TEAM_LEAD.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with Admin, Logistics, or TeamLead role can access this endpoint"
        )
    return current_user


class MealCountSummary(BaseModel):
    meal_type: str
    total_employees: int
    opted_in: int
    opted_out: int
    opted_in_percentage: float = Field(..., ge=0, le=100)
    opted_out_percentage: float = Field(..., ge=0, le=100)


class HeadcountSummary(BaseModel):
    date: str
    total_employees: int
    meal_counts: List[MealCountSummary]


class MealUserDetail(BaseModel):
    user_id: int
    name: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None


class MealUserList(BaseModel):
    meal_type: str
    date: str
    opted_in_count: int
    users: List[MealUserDetail]


class HeadcountAggregationRow(BaseModel):
    team: Optional[str] = None
    team_id: Optional[int] = None
    meal: str
    total_in: int
    total_out: int
    office_count: int   # total employees in office on this date (location-level, not meal-specific)
    wfh_count: int      # total employees WFH on this date (location-level, not meal-specific)
    office_in: int = 0  # opted-in employees who are in office for this meal
    wfh_in: int = 0     # opted-in employees who are WFH for this meal


class HeadcountAggregationResponse(BaseModel):
    date: str
    data: List[HeadcountAggregationRow]


@router.get("", response_model=HeadcountSummary)
async def get_headcount_summary(
    team_id: Optional[int] = Query(None, description="Filter by team ID (Admin/Logistics only)"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (default: tomorrow)"),
    current_user: User = Depends(require_admin_logistics_or_teamlead)):
    # Default to tomorrow if no date provided
    if date is None:
        date = get_tomorrows_date()
    else:
        # Validate date format
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Please use YYYY-MM-DD format."
            )

    users_data = storage.read_users()
    participation_data = storage.read_participation()

    # Scope: TeamLead can only see their own team
    effective_team_id = team_id
    if current_user.role == UserRole.TEAM_LEAD.value:
        effective_team_id = current_user.team_id

    # Filter users: only approved; when filtering by team, exclude users without a team
    filtered_users = [
        u for u in users_data
        if u.get("status") == UserStatus.APPROVED.value
        and (effective_team_id is None or u.get("team_id") == effective_team_id)
    ]

    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == date:
            participation_lookup[record.get("user_id")] = record

    total_employees = len(filtered_users)

    meal_counts = {}
    for meal_type in MealType:
        meal_counts[meal_type] = {"opted_in": 0, "opted_out": 0}

    for user_dict in filtered_users:
        user_id = user_dict.get("id")
        participation_record = participation_lookup.get(user_id)

        for meal_type in MealType:
            if participation_record:
                meals = participation_record.get("meals", {})
                opted_in = meals.get(meal_type.value, False)
            else:
                opted_in = True

            if opted_in:
                meal_counts[meal_type]["opted_in"] += 1
            else:
                meal_counts[meal_type]["opted_out"] += 1

    meal_count_summaries = []
    for meal_type in MealType:
        opted_in = meal_counts[meal_type]["opted_in"]
        opted_out = meal_counts[meal_type]["opted_out"]
        opted_in_percentage = (opted_in / total_employees * 100) if total_employees > 0 else 0.0
        opted_out_percentage = (opted_out / total_employees * 100) if total_employees > 0 else 0.0

        meal_count_summaries.append(MealCountSummary(
            meal_type=meal_type.value,
            total_employees=total_employees,
            opted_in=opted_in,
            opted_out=opted_out,
            opted_in_percentage=round(opted_in_percentage, 2),
            opted_out_percentage=round(opted_out_percentage, 2)
        ))

    return HeadcountSummary(
        date=date,
        total_employees=total_employees,
        meal_counts=meal_count_summaries
    )


@router.get("/aggregation", response_model=HeadcountAggregationResponse)
async def get_headcount_aggregation(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (default: today)"),
    current_user: User = Depends(require_admin_logistics_or_teamlead)):
    # Default to today if no date provided
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    # Validate date format
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Please use YYYY-MM-DD format."
        )

    users_data = storage.read_users()
    participation_data = storage.read_participation()
    work_locations_data = storage.read_work_locations()
    teams_data = storage.read_teams()

    # Build team name map
    team_name_map = {t["id"]: t["name"] for t in teams_data}

    # Build work location lookup for the given date
    work_location_lookup: Dict[int, WorkLocationType] = {}
    for record in work_locations_data:
        if record.get("date") == date:
            work_location_lookup[record.get("user_id")] = record.get("location")

    # Build participation lookup for the given date
    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == date:
            participation_lookup[record.get("user_id")] = record

    # Determine which teams to include based on user role
    if current_user.role == UserRole.TEAM_LEAD.value:
        # Team Lead can only see their own team
        if current_user.team_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Team Lead must be assigned to a team to view headcount"
            )
        target_team_ids = [current_user.team_id]
    else:
        # Admin and Logistics can see all teams
        target_team_ids = None  # All teams

    # Filter approved users
    filtered_users = [
        u for u in users_data
        if u.get("status") == UserStatus.APPROVED.value
        and (target_team_ids is None or u.get("team_id") in target_team_ids)
    ]

    # Pre-compute true office/WFH headcounts per team (all employees, regardless of meal opt-in)
    team_location_totals: Dict = {}
    for user_dict in filtered_users:
        team_id = user_dict.get("team_id")
        user_id = user_dict.get("id")
        work_location = work_location_lookup.get(user_id, WorkLocationType.OFFICE)
        if team_id not in team_location_totals:
            team_location_totals[team_id] = {"office": 0, "wfh": 0}
        if work_location == WorkLocationType.OFFICE:
            team_location_totals[team_id]["office"] += 1
        else:
            team_location_totals[team_id]["wfh"] += 1

    # Aggregate data by (team_id, meal_type)
    aggregation: Dict[tuple, Dict] = {}

    for user_dict in filtered_users:
        user_id = user_dict.get("id")
        team_id = user_dict.get("team_id")
        team_name = team_name_map.get(team_id, "Unassigned")
        participation_record = participation_lookup.get(user_id)

        for meal_type in MealType:
            key = (team_id, meal_type.value)

            if key not in aggregation:
                loc = team_location_totals.get(team_id, {"office": 0, "wfh": 0})
                aggregation[key] = {
                    "team_id": team_id,
                    "team_name": team_name,
                    "meal": meal_type.value,
                    "total_in": 0,
                    "total_out": 0,
                    "office_count": loc["office"],
                    "wfh_count": loc["wfh"],
                    "office_in": 0,
                    "wfh_in": 0,
                }

            work_location = work_location_lookup.get(user_id, WorkLocationType.OFFICE)

            if participation_record:
                meals = participation_record.get("meals", {})
                opted_in = meals.get(meal_type.value, False)
            else:
                opted_in = True

            if opted_in:
                aggregation[key]["total_in"] += 1
                if work_location == WorkLocationType.OFFICE:
                    aggregation[key]["office_in"] += 1
                else:
                    aggregation[key]["wfh_in"] += 1
            else:
                aggregation[key]["total_out"] += 1

    # Convert to response format
    data_rows = []
    for key, value in aggregation.items():
        data_rows.append(HeadcountAggregationRow(
            team=value["team_name"],
            team_id=value["team_id"],
            meal=value["meal"],
            total_in=value["total_in"],
            total_out=value["total_out"],
            office_count=value["office_count"],
            wfh_count=value["wfh_count"],
            office_in=value["office_in"],
            wfh_in=value["wfh_in"],
        ))

    # Sort by team name, then by meal type
    data_rows.sort(key=lambda x: (x.team or "", x.meal))

    return HeadcountAggregationResponse(
        date=date,
        data=data_rows
    )


@router.get("/{meal_type}", response_model=MealUserList)
async def get_meal_users(
    meal_type: str,
    team_id: Optional[int] = Query(None, description="Filter by team ID (Admin/Logistics only)"),
    current_user: User = Depends(require_admin_logistics_or_teamlead)):
    today = get_tomorrows_date()

    valid_meal_types = {mt.value for mt in MealType}
    if meal_type not in valid_meal_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid meal type: {meal_type}. Valid types are: {', '.join(sorted(valid_meal_types))}"
        )

    users_data = storage.read_users()
    participation_data = storage.read_participation()
    teams_data = storage.read_teams()
    team_name_map = {t["id"]: t["name"] for t in teams_data}

    # Scope: TeamLead can only see their own team
    effective_team_id = team_id
    if current_user.role == UserRole.TEAM_LEAD.value:
        effective_team_id = current_user.team_id

    # Filter users: only approved; when filtering by team, exclude users without a team
    filtered_users = [
        u for u in users_data
        if u.get("status") == UserStatus.APPROVED.value
        and (effective_team_id is None or u.get("team_id") == effective_team_id)
    ]

    participation_lookup: Dict[int, Dict] = {}
    for record in participation_data:
        if record.get("date") == today:
            participation_lookup[record.get("user_id")] = record

    opted_in_users = []
    for user_dict in filtered_users:
        user_id = user_dict.get("id")
        participation_record = participation_lookup.get(user_id)

        if participation_record:
            meals = participation_record.get("meals", {})
            opted_in = meals.get(meal_type, False)
        else:
            opted_in = True

        if opted_in:
            opted_in_users.append(MealUserDetail(
                user_id=user_dict.get("id"),
                name=user_dict.get("name"),
                team_id=user_dict.get("team_id"),
                team_name=team_name_map.get(user_dict.get("team_id"))
            ))

    return MealUserList(
        meal_type=meal_type,
        date=today,
        opted_in_count=len(opted_in_users),
        users=opted_in_users
    )
