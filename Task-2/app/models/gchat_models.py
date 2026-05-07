from __future__ import annotations

from pydantic import BaseModel


class GChatSender(BaseModel):
    name: str = ""
    displayName: str = ""
    email: str = ""
    type: str = "HUMAN"

    def get_google_user_id(self) -> str:
        """Extract the Google user ID from 'users/<googleUserId>'."""
        if self.name.startswith("users/"):
            return self.name[len("users/"):]
        return self.name


class GChatSpace(BaseModel):
    name: str = ""
    type: str = ""
    displayName: str = ""


class GChatSlashCommand(BaseModel):
    commandId: str | int | float = ""

    def get_command_id(self) -> str:
        return str(int(self.commandId)) if self.commandId else ""


class GChatMessage(BaseModel):
    name: str = ""
    sender: GChatSender = GChatSender()
    text: str = ""
    argumentText: str = ""
    slashCommand: GChatSlashCommand | None = None


class GChatEvent(BaseModel):
    type: str = ""
    eventTime: str = ""
    space: GChatSpace = GChatSpace()
    message: GChatMessage = GChatMessage()
    user: GChatSender = GChatSender()

    def get_sender(self) -> GChatSender:
        """Return the sender from the message payload, falling back to top-level user."""
        if self.message.sender.name:
            return self.message.sender
        return self.user

    def get_space_name(self) -> str:
        return self.space.name
