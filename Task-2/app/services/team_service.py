from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_table = _dynamodb.Table(settings.dynamodb_table)


def create_team(team_id: str, name: str, lead_user_id: str, created_by: str) -> str:
    """Create a new team and add the lead as its first member."""
    try:
        now = datetime.now(ZoneInfo(settings.timezone)).isoformat()
        _table.put_item(
            Item={
                "PK": "TEAM",
                "SK": team_id,
                "team_id": team_id,
                "name": name,
                "lead_user_id": lead_user_id,
                "created_by": created_by,
                "created_at": now,
            },
            ConditionExpression="attribute_not_exists(SK)",
        )
        # Add lead as a member of their own team
        _table.put_item(Item={
            "PK": f"TEAMMEMBER#{team_id}",
            "SK": f"USER#{lead_user_id}",
            "GSI1PK": f"USER#{lead_user_id}",
            "GSI1SK": f"TEAMMEMBER#{team_id}",
            "team_id": team_id,
            "user_id": lead_user_id,
            "added_by": created_by,
            "added_at": now,
        })
        return f"Team **{name}** (`{team_id}`) created with <@{lead_user_id}> as lead."
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return f"Team `{team_id}` already exists."
        logger.error("Failed to create team %s: %s", team_id, e)
        raise


def delete_team(team_id: str) -> str:
    """Delete a team and all its membership records."""
    try:
        _table.delete_item(Key={"PK": "TEAM", "SK": team_id})
        response = _table.query(KeyConditionExpression=Key("PK").eq(f"TEAMMEMBER#{team_id}"))
        for item in response.get("Items", []):
            _table.delete_item(Key={"PK": f"TEAMMEMBER#{team_id}", "SK": item["SK"]})
        return f"Team `{team_id}` and all its memberships have been deleted."
    except ClientError as e:
        logger.error("Failed to delete team %s: %s", team_id, e)
        raise


def add_member(team_id: str, user_id: str, added_by: str) -> str:
    """Add a user to a team."""
    try:
        _table.put_item(Item={
            "PK": f"TEAMMEMBER#{team_id}",
            "SK": f"USER#{user_id}",
            "GSI1PK": f"USER#{user_id}",
            "GSI1SK": f"TEAMMEMBER#{team_id}",
            "team_id": team_id,
            "user_id": user_id,
            "added_by": added_by,
            "added_at": datetime.now(ZoneInfo(settings.timezone)).isoformat(),
        })
        return f"<@{user_id}> added to team `{team_id}`."
    except ClientError as e:
        logger.error("Failed to add member %s to team %s: %s", user_id, team_id, e)
        raise


def remove_member(team_id: str, user_id: str) -> str:
    """Remove a user from a team."""
    try:
        _table.delete_item(Key={"PK": f"TEAMMEMBER#{team_id}", "SK": f"USER#{user_id}"})
        return f"<@{user_id}> removed from team `{team_id}`."
    except ClientError as e:
        logger.error("Failed to remove member %s from team %s: %s", user_id, team_id, e)
        raise


def get_team_members(team_id: str) -> list[str]:
    """Return all user_ids belonging to a team."""
    try:
        response = _table.query(KeyConditionExpression=Key("PK").eq(f"TEAMMEMBER#{team_id}"))
        return [item["user_id"] for item in response.get("Items", [])]
    except ClientError as e:
        logger.error("Failed to get members for team %s: %s", team_id, e)
        return []


def get_user_team(user_id: str) -> dict | None:
    """Return the team record for the team this user belongs to (or leads)."""
    try:
        response = _table.query(
            IndexName="GSI1",
            KeyConditionExpression=(
                Key("GSI1PK").eq(f"USER#{user_id}") & Key("GSI1SK").begins_with("TEAMMEMBER#")
            ),
        )
        items = response.get("Items", [])
        if not items:
            return None
        team_id = items[0]["team_id"]
        return get_team(team_id)
    except ClientError as e:
        logger.error("Failed to get team for user %s: %s", user_id, e)
        return None


def get_team(team_id: str) -> dict | None:
    """Return the team record for a given team_id."""
    try:
        response = _table.get_item(Key={"PK": "TEAM", "SK": team_id})
        return response.get("Item")
    except ClientError as e:
        logger.error("Failed to get team %s: %s", team_id, e)
        return None


def list_teams() -> list[dict]:
    """Return all teams sorted by name."""
    try:
        response = _table.query(KeyConditionExpression=Key("PK").eq("TEAM"))
        return sorted(response.get("Items", []), key=lambda x: x["name"])
    except ClientError as e:
        logger.error("Failed to list teams: %s", e)
        return []
