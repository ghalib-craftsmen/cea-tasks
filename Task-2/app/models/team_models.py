from __future__ import annotations

from pydantic import BaseModel


class Team(BaseModel):
    team_id: str
    name: str
    lead_user_id: str
    created_by: str
    created_at: str = ""
