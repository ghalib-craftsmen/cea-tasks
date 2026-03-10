from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import TypeSerializer
from botocore.exceptions import ClientError

from app.config import settings
from app.models.meal_models import EventConfig, MealRecord

logger = logging.getLogger(__name__)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_meal_table = _dynamodb.Table(settings.dynamodb_meal_table)
_history_table = _dynamodb.Table(settings.dynamodb_user_history_table)

_EVENTS_PATH = Path(__file__).parent.parent.parent / "config" / "events.json"
_serializer = TypeSerializer()


def _serialize(item: dict) -> dict:
    """Convert a plain Python dict to DynamoDB wire format for use with transact_write_items."""
    return {k: _serializer.serialize(v) for k, v in item.items()}


def _load_events() -> list[EventConfig]:
    with _EVENTS_PATH.open() as f:
        return [EventConfig(**e) for e in json.load(f)]


def is_event_day(date: str) -> bool:
    return any(e.date == date for e in _load_events())


def check_cutoff(target_date: str, bypass: bool = False) -> str | None:
    """Return an error message string if the update should be rejected, else None."""
    if bypass:
        return None

    tz = ZoneInfo(settings.timezone)
    now = datetime.now(tz)
    today = now.date()

    target = datetime.strptime(target_date, "%Y-%m-%d").date()

    if target <= today:
        return f"Cannot update records for today or a past date."

    cutoff_hour, cutoff_minute = map(int, settings.default_cutoff_time.split(":"))
    cutoff_date = target - timedelta(days=1)
    cutoff_dt = datetime(
        cutoff_date.year, cutoff_date.month, cutoff_date.day,
        cutoff_hour, cutoff_minute,
        tzinfo=tz,
    )

    if now >= cutoff_dt:
        return f"Cut-off time has passed for {target_date}. Changes are no longer accepted."

    return None


def get_record(date: str, user_id: str) -> MealRecord | None:
    try:
        response = _meal_table.get_item(
            Key={"pk": f"DATE#{date}", "sk": f"USER#{user_id}"}
        )
        item = response.get("Item")
        return MealRecord.from_dynamo(item) if item else None
    except ClientError as e:
        logger.error("DynamoDB get_item failed for date=%s user_id=%s: %s", date, user_id, e)
        raise


def upsert_record(record: MealRecord) -> None:
    """Write-through: atomic write to mhp-meal-records and mhp-user-history via TransactWriteItems."""
    record.updated_at = datetime.now(ZoneInfo(settings.timezone)).isoformat()
    try:
        _dynamodb.meta.client.transact_write_items(
            TransactItems=[
                {"Put": {"TableName": settings.dynamodb_meal_table, "Item": _serialize(record.to_dynamo())}},
                {"Put": {"TableName": settings.dynamodb_user_history_table, "Item": _serialize(record.to_user_history_dynamo())}},
            ]
        )
    except ClientError as e:
        logger.error("DynamoDB transact_write failed for date=%s user_id=%s: %s", record.date, record.user_id, e)
        raise


def opt_in(date: str, user_id: str, updated_by: str, bypass_cutoff: bool = False) -> str:
    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    record.meal_opt_in = True
    record.updated_by = updated_by
    upsert_record(record)
    return f"You are opted **in** for the meal on {date}."


def opt_out(date: str, user_id: str, updated_by: str, bypass_cutoff: bool = False) -> str:
    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    record.meal_opt_in = False
    record.updated_by = updated_by
    upsert_record(record)

    if is_event_day(date):
        return f"You have opted out of the event meal on {date}."
    return f"You have opted **out** of the meal on {date}."


def update_location(
    date: str,
    user_id: str,
    location: str,
    updated_by: str,
    bypass_cutoff: bool = False,
) -> str:
    location = location.upper()
    if location not in {"OFFICE", "WFH"}:
        return "Invalid location. Use `OFFICE` or `WFH`."

    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    record.work_location = location
    record.updated_by = updated_by
    upsert_record(record)
    return f"Work location set to **{location}** for {date}."


def update_meal_type(
    date: str,
    user_id: str,
    meal_type: str,
    updated_by: str,
    bypass_cutoff: bool = False,
) -> str:
    VALID_MEAL_TYPES = {"LUNCH", "SNACKS", "IFTAR", "EVENT_DINNER", "OPTIONAL_DINNER"}
    meal_type = meal_type.upper().replace(" ", "_")
    if meal_type not in VALID_MEAL_TYPES:
        return f"Invalid meal type. Choose from: {', '.join(sorted(VALID_MEAL_TYPES))}."

    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    record.meal_type = meal_type
    record.updated_by = updated_by
    upsert_record(record)
    return f"Meal type set to **{meal_type}** for {date}."


def get_records_for_date(date: str) -> list[MealRecord]:
    """Query mhp-meal-records by date partition key."""
    try:
        response = _meal_table.query(
            KeyConditionExpression=Key("pk").eq(f"DATE#{date}")
        )
        return [MealRecord.from_dynamo(item) for item in response.get("Items", [])]
    except ClientError as e:
        logger.error("DynamoDB query failed for date=%s: %s", date, e)
        raise


def get_user_history(user_id: str) -> list[MealRecord]:
    """Query mhp-user-history for all records belonging to a user."""
    try:
        response = _history_table.query(
            KeyConditionExpression=Key("pk").eq(f"USER#{user_id}")
        )
        return [MealRecord.from_dynamo(item) for item in response.get("Items", [])]
    except ClientError as e:
        logger.error("DynamoDB query failed for user_id=%s: %s", user_id, e)
        raise
