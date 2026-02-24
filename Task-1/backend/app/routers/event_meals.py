from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, EventMealCreate, EventMealResponse


router = APIRouter(prefix="/api/event-meals", tags=["event-meals"])
storage = JSONStorage()


async def require_admin_or_logistics(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Logistics can manage event meals"
        )
    return current_user


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
    """Delete an event meal by ID. Access: Admin, Logistics."""
    event_meals = storage.read_event_meals()

    updated = [em for em in event_meals if em.get("id") != event_id]

    if len(updated) == len(event_meals):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event meal not found"
        )

    storage.write_event_meals(updated)
    return None
