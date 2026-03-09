from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DiscordUser(BaseModel):
    id: str
    username: str
    discriminator: str = "0"
    global_name: str | None = None


class DiscordMember(BaseModel):
    user: DiscordUser
    roles: list[str] = []
    nick: str | None = None


class CommandOption(BaseModel):
    name: str
    type: int
    value: Any = None
    options: list[CommandOption] = []


CommandOption.model_rebuild()


class InteractionData(BaseModel):
    id: str
    name: str
    type: int
    options: list[CommandOption] = []


class DiscordInteraction(BaseModel):
    id: str
    application_id: str
    type: int
    guild_id: str | None = None
    member: DiscordMember | None = None
    user: DiscordUser | None = None
    token: str
    data: InteractionData | None = None

    def get_user(self) -> DiscordUser:
        if self.member:
            return self.member.user
        if self.user:
            return self.user
        raise ValueError("No user found in interaction payload")

    def get_roles(self) -> list[str]:
        if self.member:
            return self.member.roles
        return []
