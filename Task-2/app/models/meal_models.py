from __future__ import annotations

from pydantic import BaseModel


class MealRecord(BaseModel):
    date: str                       # YYYY-MM-DD — partition key
    user_id: str                    # Discord snowflake — sort key
    meal_opt_in: bool = True
    work_location: str = "OFFICE"   # OFFICE | WFH
    meal_type: str = "STANDARD"     # STANDARD | VEGETARIAN
    updated_at: str = ""
    updated_by: str = ""

    @classmethod
    def from_dynamo(cls, item: dict) -> MealRecord:
        return cls(
            date=item["date"],
            user_id=item["user_id"],
            meal_opt_in=item.get("meal_opt_in", True),
            work_location=item.get("work_location", "OFFICE"),
            meal_type=item.get("meal_type", "STANDARD"),
            updated_at=item.get("updated_at", ""),
            updated_by=item.get("updated_by", ""),
        )

    def to_dynamo(self) -> dict:
        return {
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
