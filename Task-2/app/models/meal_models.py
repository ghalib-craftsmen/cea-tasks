from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

WorkLocation = Literal["OFFICE", "WFH"]
MealType = Literal["LUNCH", "SNACKS", "IFTAR", "EVENT_DINNER", "OPTIONAL_DINNER"]


class MealRecord(BaseModel):
    date: str                               # YYYY-MM-DD — partition key
    user_id: str                            # Discord snowflake — sort key
    meal_opt_in: bool = True
    work_location: WorkLocation = "OFFICE"
    meal_type: MealType = "LUNCH"
    updated_at: str = ""
    updated_by: str = ""

    @classmethod
    def from_dynamo(cls, item: dict) -> MealRecord:
        return cls(
            date=item["date"],
            user_id=item["user_id"],
            meal_opt_in=item.get("meal_opt_in", True),
            work_location=item.get("work_location", "OFFICE"),
            meal_type=item.get("meal_type", "LUNCH"),
            updated_at=item.get("updated_at", ""),
            updated_by=item.get("updated_by", ""),
        )

    def to_dynamo(self) -> dict:
        """Item for mhp-meal-records: pk=DATE#{date}, sk=USER#{user_id}."""
        return {
            "pk": f"DATE#{self.date}",
            "sk": f"USER#{self.user_id}",
            "date": self.date,
            "user_id": self.user_id,
            "meal_opt_in": self.meal_opt_in,
            "work_location": self.work_location,
            "meal_type": self.meal_type,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
        }

    def to_user_history_dynamo(self) -> dict:
        """Item for mhp-user-history: pk=USER#{user_id}, sk=DATE#{date}."""
        return {
            "pk": f"USER#{self.user_id}",
            "sk": f"DATE#{self.date}",
            "date": self.date,
            "user_id": self.user_id,
            "meal_opt_in": self.meal_opt_in,
            "work_location": self.work_location,
            "meal_type": self.meal_type,
            "updated_at": self.updated_at,
            "updated_by": self.updated_by,
        }


class EventConfig(BaseModel):
    date: str          # YYYY-MM-DD
    description: str
