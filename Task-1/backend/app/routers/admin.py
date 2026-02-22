from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import require_admin
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, ApproveUserRequest, RejectUserRequest


router = APIRouter(prefix="/api/admin", tags=["admin"])

storage = JSONStorage()


class PendingUserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: str
    status: str


class UserListResponse(BaseModel):
    id: int
    username: str
    name: str
    email: str
    role: str
    team_id: int | None = None
    team_name: str | None = None
    status: str



def _check_teamlead_uniqueness(users_data: list, team_id: int | None, role: str, exclude_user_id: int | None = None) -> None:
    """Enforce: each team can have only one TeamLead."""
    if role != UserRole.TEAM_LEAD.value or team_id is None:
        return
    for u in users_data:
        if u.get("id") == exclude_user_id:
            continue
        if u.get("team_id") == team_id and u.get("role") == UserRole.TEAM_LEAD.value and u.get("status") == UserStatus.APPROVED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team {team_id} already has a TeamLead. Each team can have only one TeamLead."
            )


def _get_team_name(team_id: int | None) -> str | None:
    if team_id is None:
        return None
    teams_data = storage.read_teams()
    for t in teams_data:
        if t.get("id") == team_id:
            return t.get("name")
    return None


@router.get("/pending-users", response_model=List[PendingUserResponse])
async def get_pending_users(current_user: User = Depends(require_admin)):
    """Get all users with Pending status. Admin only."""
    users_data = storage.read_users()
    return [
        PendingUserResponse(
            id=u["id"],
            username=u["username"],
            name=u["name"],
            email=u["email"],
            status=u.get("status", UserStatus.PENDING.value)
        )
        for u in users_data
        if u.get("status") == UserStatus.PENDING.value
    ]


@router.get("/users", response_model=List[UserListResponse])
async def get_all_users(current_user: User = Depends(require_admin)):
    """Get all users. Admin only."""
    users_data = storage.read_users()
    result = []
    for u in users_data:
        result.append(UserListResponse(
            id=u["id"],
            username=u["username"],
            name=u["name"],
            email=u["email"],
            role=u.get("role", "Employee"),
            team_id=u.get("team_id"),
            team_name=_get_team_name(u.get("team_id")),
            status=u.get("status", UserStatus.PENDING.value)
        ))
    return result


@router.put("/approve-user")
async def approve_user(
    request: ApproveUserRequest,
    current_user: User = Depends(require_admin)):
    """Approve a pending user and assign role + team. Admin only. Enforces one TeamLead per team."""
    users_data = storage.read_users()

    user_index = None
    for i, u in enumerate(users_data):
        if u.get("id") == request.user_id:
            user_index = i
            break

    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {request.user_id} not found"
        )

    if users_data[user_index].get("status") != UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in Pending status"
        )

    # Enforce one TeamLead per team
    _check_teamlead_uniqueness(users_data, request.team_id, request.role, exclude_user_id=request.user_id)

    users_data[user_index]["role"] = request.role
    users_data[user_index]["team_id"] = request.team_id
    users_data[user_index]["status"] = UserStatus.APPROVED.value

    storage.write_users(users_data)

    return {
        "message": f"User '{users_data[user_index]['username']}' has been approved",
        "user_id": request.user_id
    }


@router.put("/reject-user")
async def reject_user(
    request: RejectUserRequest,
    current_user: User = Depends(require_admin)):
    """Reject a pending user. Admin only."""
    users_data = storage.read_users()

    user_index = None
    for i, u in enumerate(users_data):
        if u.get("id") == request.user_id:
            user_index = i
            break

    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {request.user_id} not found"
        )

    if users_data[user_index].get("status") != UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in Pending status"
        )

    users_data[user_index]["status"] = UserStatus.REJECTED.value

    storage.write_users(users_data)

    return {
        "message": f"User '{users_data[user_index]['username']}' has been rejected",
        "user_id": request.user_id
    }


class UpdateUserRequest(BaseModel):
    role: str | None = None
    team_id: int | None = None


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    request: UpdateUserRequest,
    current_user: User = Depends(require_admin)):
    """Update a user's role or team. Admin only. Enforces one TeamLead per team."""
    users_data = storage.read_users()

    user_index = None
    for i, u in enumerate(users_data):
        if u.get("id") == user_id:
            user_index = i
            break

    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    new_role = request.role if request.role is not None else users_data[user_index].get("role")
    new_team_id = request.team_id if request.team_id is not None else users_data[user_index].get("team_id")

    _check_teamlead_uniqueness(users_data, new_team_id, new_role, exclude_user_id=user_id)

    if request.role is not None:
        users_data[user_index]["role"] = request.role
    if request.team_id is not None:
        users_data[user_index]["team_id"] = request.team_id

    storage.write_users(users_data)

    return {
        "message": f"User '{users_data[user_index]['username']}' updated successfully",
        "user_id": user_id
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin)):
    """Delete a user. Admin only. Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    users_data = storage.read_users()

    user_index = None
    for i, u in enumerate(users_data):
        if u.get("id") == user_id:
            user_index = i
            break

    if user_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    deleted_username = users_data[user_index]["username"]
    users_data.pop(user_index)

    storage.write_users(users_data)

    return {
        "message": f"User '{deleted_username}' has been deleted",
        "user_id": user_id
    }
