from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, AuditLogResponse


router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])
storage = JSONStorage()


async def require_admin_logistics_or_teamlead(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value, UserRole.TEAM_LEAD.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Logistics, or TeamLead can view audit logs"
        )
    return current_user


def _build_user_name_map() -> dict:
    """Return a dict of user_id -> name from users.json."""
    users_data = storage.read_users()
    return {u["id"]: u.get("name", u.get("username", "Unknown")) for u in users_data}


def _get_team_member_ids(team_lead: User) -> set:
    """Return the set of user_ids that belong to the team lead's team."""
    users_data = storage.read_users()
    return {u["id"] for u in users_data if u.get("team_id") == team_lead.team_id}


@router.get("", response_model=List[AuditLogResponse])
async def get_audit_logs(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    target_user_id: Optional[int] = Query(None, description="Filter by target user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(200, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(require_admin_logistics_or_teamlead),
):
    """
    Get audit logs.
    - Admin/Logistics: see all logs.
    - TeamLead: see only logs where target_user_id is a member of their team.
    """
    audit_logs = storage.read_audit_logs()
    name_map = _build_user_name_map()

    # TeamLead scope: only their team members' logs
    if current_user.role == UserRole.TEAM_LEAD.value:
        allowed_ids = _get_team_member_ids(current_user)
        audit_logs = [log for log in audit_logs if log.get("target_user_id") in allowed_ids]

    # Optional filters
    if date:
        audit_logs = [log for log in audit_logs if log.get("date") == date]
    if target_user_id is not None:
        audit_logs = [log for log in audit_logs if log.get("target_user_id") == target_user_id]
    if action_type:
        audit_logs = [log for log in audit_logs if log.get("action_type") == action_type]

    # Sort newest first, then apply limit
    audit_logs = sorted(audit_logs, key=lambda x: x.get("timestamp", ""), reverse=True)
    audit_logs = audit_logs[:limit]

    return [
        AuditLogResponse(
            id=log["id"],
            timestamp=log["timestamp"],
            actor_user_id=log["actor_user_id"],
            actor_name=name_map.get(log["actor_user_id"]),
            target_user_id=log["target_user_id"],
            target_name=name_map.get(log["target_user_id"]),
            action_type=log["action_type"],
            new_value=log["new_value"],
            date=log.get("date"),
        )
        for log in audit_logs
    ]
