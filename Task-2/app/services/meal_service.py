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
_table = _dynamodb.Table(settings.dynamodb_table)

_EVENTS_PATH = Path(__file__).parent.parent.parent / "config" / "events.json"
_serializer = TypeSerializer()
_WFH_MONTHLY_LIMIT = 5

# Loaded once at module level — captured in SnapStart snapshot
with _EVENTS_PATH.open() as _f:
    _EVENTS: list[EventConfig] = [EventConfig(**e) for e in json.load(_f)]


def _serialize(item: dict) -> dict:
    return {k: _serializer.serialize(v) for k, v in item.items()}


def _load_events() -> list[EventConfig]:
    return _EVENTS


def is_event_day(date: str) -> bool:
    return any(e.date == date for e in _EVENTS)


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
        meal_resp = _table.get_item(Key={"PK": f"MEAL#{date}", "SK": f"USER#{user_id}"})
        loc_resp = _table.get_item(Key={"PK": f"LOC#{date}", "SK": f"USER#{user_id}"})
        return MealRecord.from_dynamo_pair(meal_resp.get("Item"), loc_resp.get("Item"))
    except ClientError as e:
        logger.error("DynamoDB get_item failed for date=%s user_id=%s: %s", date, user_id, e)
        raise


def upsert_record(record: MealRecord) -> None:
    """Atomically write Meal Participation and Work Location items to MHP_Table."""
    record.updated_at = datetime.now(ZoneInfo(settings.timezone)).isoformat()
    try:
        _dynamodb.meta.client.transact_write_items(
            TransactItems=[
                {"Put": {"TableName": settings.dynamodb_table, "Item": _serialize(record.to_meal_dynamo())}},
                {"Put": {"TableName": settings.dynamodb_table, "Item": _serialize(record.to_loc_dynamo())}},
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
    if location == "WFH":
        record.meal_opt_in = False
    record.updated_by = updated_by
    upsert_record(record)

    msg = f"Work location set to **{location}** for {date}."
    if location == "WFH":
        msg += "\nYou have been automatically opted **out** of all meals for this day."
        if not bypass_cutoff:
            wfh_count = count_wfh_days_this_month(user_id, date[:7])
            if wfh_count >= _WFH_MONTHLY_LIMIT:
                msg += f"\n⚠️ You have used {wfh_count} WFH day(s) this month (soft limit: {_WFH_MONTHLY_LIMIT}). Please coordinate with your team lead."
    return msg


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


def count_wfh_days_this_month(user_id: str, month_prefix: str) -> int:
    """Count WFH Work Location items for a user in a given calendar month (YYYY-MM).

    Queries GSI1: GSI1PK=USER#<userId>, GSI1SK begins_with LOC#<YYYY-MM>.
    """
    try:
        response = _table.query(
            IndexName="GSI1",
            KeyConditionExpression=(
                Key("GSI1PK").eq(f"USER#{user_id}") & Key("GSI1SK").begins_with(f"LOC#{month_prefix}")
            ),
        )
        return sum(1 for item in response.get("Items", []) if item.get("work_location") == "WFH")
    except ClientError as e:
        logger.error("DynamoDB GSI1 query failed for WFH count user_id=%s month=%s: %s", user_id, month_prefix, e)
        return 0


def get_records_for_date(date: str) -> list[MealRecord]:
    """Query MHP_Table for all meal and location items on a given date, then merge by user."""
    try:
        meal_response = _table.query(KeyConditionExpression=Key("PK").eq(f"MEAL#{date}"))
        loc_response = _table.query(KeyConditionExpression=Key("PK").eq(f"LOC#{date}"))

        meal_by_user = {item["user_id"]: item for item in meal_response.get("Items", [])}
        loc_by_user = {item["user_id"]: item for item in loc_response.get("Items", [])}

        all_user_ids = meal_by_user.keys() | loc_by_user.keys()
        return [
            MealRecord.from_dynamo_pair(meal_by_user.get(uid), loc_by_user.get(uid))
            for uid in all_user_ids
        ]
    except ClientError as e:
        logger.error("DynamoDB query failed for date=%s: %s", date, e)
        return []


def get_user_history(user_id: str) -> list[MealRecord]:
    """Query GSI1 for all meal and location items belonging to a user, then merge by date."""
    try:
        response = _table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("GSI1PK").eq(f"USER#{user_id}"),
        )
        items = response.get("Items", [])
        meal_by_date = {item["date"]: item for item in items if item.get("GSI1SK", "").startswith("MEAL#")}
        loc_by_date = {item["date"]: item for item in items if item.get("GSI1SK", "").startswith("LOC#")}

        all_dates = meal_by_date.keys() | loc_by_date.keys()
        return [
            MealRecord.from_dynamo_pair(meal_by_date.get(d), loc_by_date.get(d))
            for d in all_dates
        ]
    except ClientError as e:
        logger.error("DynamoDB GSI1 query failed for user_id=%s: %s", user_id, e)
        return []
