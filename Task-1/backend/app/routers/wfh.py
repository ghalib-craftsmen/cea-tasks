from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import WFH_ALLOWANCE
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus
from app.wfh_service import calculate_wfh_days_current_month


router = APIRouter(prefix="/api", tags=["wfh"])
storage = JSONStorage()


class WFHSummaryItem(BaseModel):
    user_id: int
    name: str
    team_id: Optional[int] = None
    days_used: int
    is_over_limit: bool
    allowance: int


async def require_admin_logistics_or_teamlead(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [
        UserRole.ADMIN.value,
        UserRole.LOGISTICS.value,
        UserRole.TEAM_LEAD.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Logistics, or TeamLead can view WFH summary",
        )
    return current_user


@router.get("/wfh-summary", response_model=List[WFHSummaryItem])
async def get_wfh_summary(
    current_user: User = Depends(require_admin_logistics_or_teamlead),
):
    """
    Returns WFH usage for the current calendar month per approved employee.

    - Admin / Logistics: see all employees.
    - TeamLead: scoped to their own team only.

    Compares days_used against the WFH_ALLOWANCE setting (default 5).
    """
    users_data = storage.read_users()
    work_locations = storage.read_work_locations()

    result: List[WFHSummaryItem] = []

    for user_dict in users_data:
        if user_dict.get("status") != UserStatus.APPROVED.value:
            continue

        # TeamLead scope
        if current_user.role == UserRole.TEAM_LEAD.value:
            if user_dict.get("team_id") != current_user.team_id:
                continue

        uid = user_dict["id"]
        days_used = calculate_wfh_days_current_month(uid, work_locations)

        result.append(
            WFHSummaryItem(
                user_id=uid,
                name=user_dict.get("name") or user_dict.get("username", "Unknown"),
                team_id=user_dict.get("team_id"),
                days_used=days_used,
                is_over_limit=days_used > WFH_ALLOWANCE,
                allowance=WFH_ALLOWANCE,
            )
        )

    return result
