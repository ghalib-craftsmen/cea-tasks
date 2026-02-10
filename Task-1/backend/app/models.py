from enum import Enum
from typing import Optional, Dict
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    EMPLOYEE = "Employee"
    TEAM_LEAD = "TeamLead"
    ADMIN = "Admin"
    LOGISTICS = "Logistics"


class MealType(str, Enum):
    LUNCH = "Lunch"
    SNACKS = "Snacks"
    IFTAR = "Iftar"
    EVENT_DINNER = "EventDinner"
    OPTIONAL_DINNER = "OptionalDinner"


class User(BaseModel):
    id: int
    username: str = Field(..., min_length=1, max_length=50)
    password_hash: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    team_id: Optional[int] = None

    class Config:
        use_enum_values = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password_hash: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    team_id: Optional[int] = None

    class Config:
        use_enum_values = True


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    role: Optional[UserRole] = Field(default=UserRole.EMPLOYEE)
    team_id: Optional[int] = None

    class Config:
        use_enum_values = True


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: str
    role: UserRole
    team_id: Optional[int] = None

    class Config:
        use_enum_values = True


class MealRecord(BaseModel):
    user_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    meals: Dict[MealType, bool] = Field(
        default_factory=lambda: {
            MealType.LUNCH: False,
            MealType.SNACKS: False,
            MealType.IFTAR: False,
            MealType.EVENT_DINNER: False,
            MealType.OPTIONAL_DINNER: False,
        }
    )

    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "date": "2026-02-10",
                "meals": {
                    "Lunch": True,
                    "Snacks": False,
                    "Iftar": True,
                    "EventDinner": False,
                    "OptionalDinner": False,
                },
            }
        }
