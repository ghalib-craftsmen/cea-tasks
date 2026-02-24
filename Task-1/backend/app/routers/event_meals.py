from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, UserStatus, EventMealCreate, EventMealResponse


router = APIRouter(prefix="/api/event-meals", tags=["event-meals"])
storage = JSONStorage()



async def require_admin_or_logistics(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Logistics can manage event meals"
        )
    return current_user



class RSVPRequest(BaseModel):
    response: str  # "accepted" | "declined"


class RSVPUserDetail(BaseModel):
    user_id: int
    name: str
    team_id: Optional[int] = None


class EventRSVPStats(BaseModel):
    event_id: int
    title: str
    date: str
    accepted: List[RSVPUserDetail]
    declined: List[RSVPUserDetail]
    pending: List[RSVPUserDetail]
    accepted_count: int
    declined_count: int
    pending_count: int



@router.get("", response_model=List[EventMealResponse])
async def get_event_meals(
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD). Returns all if omitted."),
    current_user: User = Depends(get_current_user),
):
    """Get event meals. Optionally filter by date. Access: all authenticated users."""
    event_meals = storage.read_event_meals()

    if date:
        event_meals = [em for em in event_meals if em.get("date") == date]

    return [
        EventMealResponse(
            id=em["id"],
            date=em["date"],
            title=em["title"],
            description=em.get("description"),
            created_by=em["created_by"],
        )
        for em in event_meals
    ]


@router.post("", response_model=EventMealResponse, status_code=status.HTTP_201_CREATED)
async def create_event_meal(
    request: EventMealCreate,
    current_user: User = Depends(require_admin_or_logistics),
):
    """Create a new event meal. Access: Admin, Logistics."""
    event_meals = storage.read_event_meals()

    new_id = max((em.get("id", 0) for em in event_meals), default=0) + 1

    new_event = {
        "id": new_id,
        "date": request.date,
        "title": request.title,
        "description": request.description,
        "created_by": current_user.id,
    }

    event_meals.append(new_event)
    storage.write_event_meals(event_meals)

    return EventMealResponse(
        id=new_id,
        date=request.date,
        title=request.title,
        description=request.description,
        created_by=current_user.id,
    )


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_meal(
    event_id: int,
    current_user: User = Depends(require_admin_or_logistics),
):
    """Delete an event meal by ID. Also removes all associated RSVPs."""
    event_meals = storage.read_event_meals()
    updated = [em for em in event_meals if em.get("id") != event_id]

    if len(updated) == len(event_meals):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event meal not found"
        )

    storage.write_event_meals(updated)

    # Clean up associated RSVPs
    rsvps = storage.read_event_meal_rsvps()
    storage.write_event_meal_rsvps([r for r in rsvps if r.get("event_meal_id") != event_id])

    return None



@router.get("/pending-rsvp", response_model=List[EventMealResponse])
async def get_pending_rsvps(
    current_user: User = Depends(get_current_user),
):
    """
    Returns future event meals that the current employee has NOT yet responded to.
    Admin/Logistics are excluded — they manage events, not attend them.
    """
    if current_user.role in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        return []

    today = datetime.now().strftime("%Y-%m-%d")
    event_meals = storage.read_event_meals()
    rsvps = storage.read_event_meal_rsvps()

    responded_event_ids = {
        r["event_meal_id"]
        for r in rsvps
        if r.get("user_id") == current_user.id
    }

    pending = [
        EventMealResponse(
            id=em["id"],
            date=em["date"],
            title=em["title"],
            description=em.get("description"),
            created_by=em["created_by"],
        )
        for em in event_meals
        if em.get("date", "") >= today and em["id"] not in responded_event_ids
    ]

    # Sort by date ascending so the soonest event shows first
    pending.sort(key=lambda x: x.date)
    return pending


@router.post("/{event_id}/rsvp", status_code=status.HTTP_200_OK)
async def submit_rsvp(
    event_id: int,
    request: RSVPRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Employee submits an RSVP (accepted / declined) for an event meal.
    Admin/Logistics cannot RSVP — they manage events.
    """
    if current_user.role in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin and Logistics do not RSVP to event meals"
        )

    if request.response not in ("accepted", "declined"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="response must be 'accepted' or 'declined'"
        )

    event_meals = storage.read_event_meals()
    event = next((em for em in event_meals if em.get("id") == event_id), None)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event meal not found"
        )

    rsvps = storage.read_event_meal_rsvps()

    # Upsert: update existing response or create new one
    existing_index = next(
        (i for i, r in enumerate(rsvps)
         if r.get("event_meal_id") == event_id and r.get("user_id") == current_user.id),
        None,
    )

    new_id = max((r.get("id", 0) for r in rsvps), default=0) + 1
    rsvp_record = {
        "id": new_id if existing_index is None else rsvps[existing_index]["id"],
        "event_meal_id": event_id,
        "user_id": current_user.id,
        "response": request.response,
        "responded_at": datetime.now(timezone.utc).isoformat(),
    }

    if existing_index is not None:
        rsvps[existing_index] = rsvp_record
    else:
        rsvps.append(rsvp_record)

    storage.write_event_meal_rsvps(rsvps)
    return {"event_id": event_id, "response": request.response}


@router.get("/{event_id}/rsvp-stats", response_model=EventRSVPStats)
async def get_event_rsvp_stats(
    event_id: int,
    current_user: User = Depends(require_admin_or_logistics),
):
    """
    Returns RSVP statistics for an event meal.
    Lists accepted, declined, and pending (no response yet) employees.
    Access: Admin, Logistics.
    """
    event_meals = storage.read_event_meals()
    event = next((em for em in event_meals if em.get("id") == event_id), None)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event meal not found"
        )

    users_data = storage.read_users()
    rsvps = storage.read_event_meal_rsvps()

    # Only approved non-admin/non-logistics users are expected to RSVP
    eligible_users = [
        u for u in users_data
        if u.get("status") == UserStatus.APPROVED.value
        and u.get("role") not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]
    ]

    rsvp_map = {
        r["user_id"]: r["response"]
        for r in rsvps
        if r.get("event_meal_id") == event_id
    }

    accepted, declined, pending = [], [], []

    for u in eligible_users:
        detail = RSVPUserDetail(
            user_id=u["id"],
            name=u.get("name") or u.get("username", "Unknown"),
            team_id=u.get("team_id"),
        )
        resp = rsvp_map.get(u["id"])
        if resp == "accepted":
            accepted.append(detail)
        elif resp == "declined":
            declined.append(detail)
        else:
            pending.append(detail)

    return EventRSVPStats(
        event_id=event_id,
        title=event["title"],
        date=event["date"],
        accepted=accepted,
        declined=declined,
        pending=pending,
        accepted_count=len(accepted),
        declined_count=len(declined),
        pending_count=len(pending),
    )
