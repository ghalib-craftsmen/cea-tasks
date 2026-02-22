from enum import Enum
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    EMPLOYEE = "Employee"
    TEAM_LEAD = "TeamLead"
    ADMIN = "Admin"
    LOGISTICS = "Logistics"


class UserStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


class MealType(str, Enum):
    LUNCH = "Lunch"
    SNACKS = "Snacks"
    IFTAR = "Iftar"
    EVENT_DINNER = "EventDinner"
    OPTIONAL_DINNER = "OptionalDinner"


class User(BaseModel):
    id: int
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    team_id: Optional[int] = None
    status: Optional[str] = UserStatus.PENDING.value

    class Config:
        use_enum_values = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)
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


class SelfRegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=100)


class ApproveUserRequest(BaseModel):
    user_id: int
    role: UserRole
    team_id: Optional[int] = None

    class Config:
        use_enum_values = True


class RejectUserRequest(BaseModel):
    user_id: int


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    email: str
    role: UserRole
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    status: Optional[str] = None

    class Config:
        use_enum_values = True


class Team(BaseModel):
    id: int
    name: str
    leadId: int

    class Config:
        use_enum_values = True


class MealRecord(BaseModel):
    user_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    meals: Dict[MealType, bool] = Field(
        default_factory=lambda: {
            MealType.LUNCH.value: False,
            MealType.SNACKS.value: False,
            MealType.IFTAR.value: False,
            MealType.EVENT_DINNER.value: False,
            MealType.OPTIONAL_DINNER.value: False,
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


class WorkLocationType(str, Enum):
    OFFICE = "Office"
    WFH = "WFH"


class SpecialDayType(str, Enum):
    CLOSED = "Closed"
    HOLIDAY = "Holiday"
    CELEBRATION = "Celebration"


class WorkLocation(BaseModel):
    user_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    location: WorkLocationType

    class Config:
        use_enum_values = True


class WorkLocationUpdate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    location: WorkLocationType

    class Config:
        use_enum_values = True


class WorkLocationResponse(BaseModel):
    user_id: int
    date: str
    location: WorkLocationType

    class Config:
        use_enum_values = True


class WorkLocationAdminUpdate(BaseModel):
    user_id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    location: WorkLocationType

    class Config:
        use_enum_values = True


class WFHPeriod(BaseModel):
    id: int
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")

    class Config:
        use_enum_values = True


class WFHPeriodCreate(BaseModel):
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class WFHPeriodResponse(BaseModel):
    id: int
    start_date: str
    end_date: str

    class Config:
        use_enum_values = True


class SpecialDay(BaseModel):
    id: int
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    type: SpecialDayType
    note: Optional[str] = None

    class Config:
        use_enum_values = True


class SpecialDayCreate(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    type: SpecialDayType
    note: Optional[str] = None

    class Config:
        use_enum_values = True


class SpecialDayResponse(BaseModel):
    id: int
    date: str
    type: SpecialDayType
    note: Optional[str] = None

    class Config:
        use_enum_values = True
