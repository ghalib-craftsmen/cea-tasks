from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from app.config import settings
from app.models.meal_models import EventConfig, MealRecord

logger = logging.getLogger(__name__)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_table = _dynamodb.Table(settings.dynamodb_meal_table)

_EVENTS_PATH = Path(__file__).parent.parent.parent / "config" / "events.json"


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
    cutoff_dt = datetime(
        target.year, target.month, target.day, cutoff_hour, cutoff_minute, tzinfo=tz
    ) - timedelta(days=1)

    if now >= cutoff_dt:
        return f"Cut-off time has passed for {target_date}. Changes are no longer accepted."

    return None


def get_record(date: str, user_id: str) -> MealRecord | None:
    try:
        response = _table.get_item(Key={"date": date, "user_id": user_id})
        item = response.get("Item")
        return MealRecord.from_dynamo(item) if item else None
    except ClientError as e:
        logger.error("DynamoDB get_item failed for date=%s user_id=%s: %s", date, user_id, e)
        raise


def upsert_record(record: MealRecord) -> None:
    record.updated_at = datetime.now(ZoneInfo(settings.timezone)).isoformat()
    try:
        _table.put_item(Item=record.to_dynamo())
    except ClientError as e:
        logger.error("DynamoDB put_item failed for date=%s user_id=%s: %s", record.date, record.user_id, e)
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


def get_records_for_date(date: str) -> list[MealRecord]:
    response = _table.query(KeyConditionExpression=Key("date").eq(date))
    return [MealRecord.from_dynamo(item) for item in response.get("Items", [])]
