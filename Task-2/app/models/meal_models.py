from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

WorkLocation = Literal["OFFICE", "WFH"]
MealType = Literal["LUNCH", "SNACKS", "IFTAR", "EVENT_DINNER", "OPTIONAL_DINNER"]


class MealRecord(BaseModel):
    date: str                               # YYYY-MM-DD
    user_id: str                            # Discord snowflake
    meal_opt_in: bool = True
    work_location: WorkLocation = "OFFICE"
    meal_type: MealType = "LUNCH"
    updated_at: str = ""
    updated_by: str = ""

    @classmethod
    def from_dynamo_pair(cls, meal_item: dict | None, loc_item: dict | None) -> MealRecord | None:
        """Merge a Meal Participation item and a Work Location item into a MealRecord."""
        if meal_item is None and loc_item is None:
            return None
        base = meal_item or loc_item
        return cls(
            date=base["date"],
            user_id=base["user_id"],
            meal_opt_in=(meal_item or {}).get("meal_opt_in", True),
            work_location=(loc_item or {}).get("work_location", "OFFICE"),
            meal_type=(meal_item or {}).get("meal_type", "LUNCH"),
            updated_at=base.get("updated_at", ""),
            updated_by=base.get("updated_by", ""),
        )

    def to_meal_dynamo(self) -> dict:
        """Meal Participation item: PK=MEAL#<date>, SK=USER#<userId>."""
        return {
            "PK": f"MEAL#{self.date}",
            "SK": f"USER#{self.user_id}",
            "GSI1PK": f"USER#{self.user_id}",
            "GSI1SK": f"MEAL#{self.date}",
            "date": self.date,
            "user_id": self.user_id,
            "meal_opt_in": self.meal_opt_in,
            "meal_type": self.meal_type,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
        }

    def to_loc_dynamo(self) -> dict:
        """Work Location item: PK=LOC#<date>, SK=USER#<userId>."""
        return {
            "PK": f"LOC#{self.date}",
            "SK": f"USER#{self.user_id}",
            "GSI1PK": f"USER#{self.user_id}",
            "GSI1SK": f"LOC#{self.date}",
            "date": self.date,
            "user_id": self.user_id,
            "work_location": self.work_location,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
        }


class EventConfig(BaseModel):
    date: str          # YYYY-MM-DD
    description: str
