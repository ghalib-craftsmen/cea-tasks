from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.db import JSONStorage
from app.models import User, UserRole, AppSettings, AppSettingsUpdate


router = APIRouter(prefix="/api", tags=["settings"])
storage = JSONStorage()


async def require_admin_or_logistics(current_user: User = Depends(get_current_user)) -> User:
    """Require Admin or Logistics role."""
    if current_user.role not in [UserRole.ADMIN.value, UserRole.LOGISTICS.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Logistics role can access this endpoint"
        )
    return current_user


@router.get("/settings", response_model=AppSettings)
async def get_settings(current_user: User = Depends(get_current_user)):
    """Get application settings. All authenticated users can read."""
    settings = storage.read_settings()
    return AppSettings(**settings)


@router.put("/settings", response_model=AppSettings)
async def update_settings(
    update_data: AppSettingsUpdate,
    current_user: User = Depends(require_admin_or_logistics)
):
    """Update application settings. Admin or Logistics."""
    settings = storage.read_settings()

    if update_data.cutoff_hour is not None:
        settings["cutoff_hour"] = update_data.cutoff_hour
    if update_data.cutoff_minute is not None:
        settings["cutoff_minute"] = update_data.cutoff_minute

    storage.write_settings(settings)
    return AppSettings(**settings)
