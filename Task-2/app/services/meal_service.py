from __future__ import annotations

import calendar
import json
import logging
from datetime import date as _date
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from botocore.exceptions import ClientError

from app.config import settings
from app.models.meal_models import EventConfig, MealRecord

logger = logging.getLogger(__name__)

_dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)
_table = _dynamodb.Table(settings.dynamodb_table)

_EVENTS_PATH = Path(__file__).parent.parent.parent / "config" / "events.json"
_serializer = TypeSerializer()
_deserializer = TypeDeserializer()
VALID_MEAL_TYPES = {"LUNCH", "SNACKS", "IFTAR", "EVENT_DINNER", "OPTIONAL_DINNER"}

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
        response = _dynamodb.meta.client.batch_get_item(
            RequestItems={
                settings.dynamodb_table: {
                    "Keys": [
                        {"PK": {"S": f"MEAL#{date}"}, "SK": {"S": f"USER#{user_id}"}},
                        {"PK": {"S": f"LOC#{date}"}, "SK": {"S": f"USER#{user_id}"}},
                    ]
                }
            }
        )
        items = response.get("Responses", {}).get(settings.dynamodb_table, [])
        meal_item = None
        loc_item = None
        for raw in items:
            item = {k: _deserializer.deserialize(v) for k, v in raw.items()}
            if item["PK"].startswith("MEAL#"):
                meal_item = item
            elif item["PK"].startswith("LOC#"):
                loc_item = item
        return MealRecord.from_dynamo_pair(meal_item, loc_item)
    except ClientError as e:
        logger.error("DynamoDB batch_get_item failed for date=%s user_id=%s: %s", date, user_id, e)
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


def opt_in(date: str, user_id: str, updated_by: str, meal_types: list[str] | None = None, bypass_cutoff: bool = False) -> str:
    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    if meal_types:
        record.opted_out_meals = [m for m in record.opted_out_meals if m not in meal_types]
    else:
        record.meal_opt_in = True
        record.opted_out_meals = []
    record.updated_by = updated_by
    upsert_record(record)
    if meal_types:
        return f"You are opted **in** for **{', '.join(meal_types)}** on {date}."
    return f"You are opted **in** for all meals on {date}."


def opt_out(date: str, user_id: str, updated_by: str, meal_types: list[str] | None = None, bypass_cutoff: bool = False) -> str:
    err = check_cutoff(date, bypass=bypass_cutoff)
    if err:
        return err

    record = get_record(date, user_id) or MealRecord(date=date, user_id=user_id)
    if meal_types:
        record.opted_out_meals = list(set(record.opted_out_meals) | set(meal_types))
    else:
        record.meal_opt_in = False
        record.opted_out_meals = []
    record.updated_by = updated_by
    upsert_record(record)

    if meal_types:
        return f"You have opted **out** of **{', '.join(meal_types)}** on {date}."
    if is_event_day(date):
        return f"You have opted out of the event meal on {date}."
    return f"You have opted **out** of all meals on {date}."


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
            if wfh_count >= settings.wfh_monthly_limit:
                msg += f"\n⚠️ You have used {wfh_count} WFH day(s) this month (soft limit: {settings.wfh_monthly_limit}). Please coordinate with your team lead."
    return msg




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


def bulk_meal_update(
    start_date: str,
    end_date: str,
    do_opt_in: bool,
    user_id: str,
    updated_by: str,
    bypass_cutoff: bool = False,
) -> str:
    """Apply meal opt-in/out across every day in [start_date, end_date]."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return "Invalid date format. Use YYYY-MM-DD."
    if start > end:
        return "Start date must be on or before end date."

    fn = opt_in if do_opt_in else opt_out
    updated, skipped = 0, []
    current = start
    while current <= end:
        date_str = str(current)
        result = fn(date_str, user_id, updated_by=updated_by, bypass_cutoff=bypass_cutoff)
        if result.startswith("Cannot") or result.startswith("Cut-off"):
            skipped.append(date_str)
        else:
            updated += 1
        current += timedelta(days=1)

    action = "in" if do_opt_in else "out"
    msg = f"Opted **{action}** for {updated} day(s) between {start_date} and {end_date}."
    if skipped:
        preview = ", ".join(skipped[:3]) + ("…" if len(skipped) > 3 else "")
        msg += f"\nSkipped {len(skipped)} day(s) past cut-off: {preview}"
    return msg


def bulk_location_update(
    start_date: str,
    end_date: str,
    location: str,
    user_id: str,
    updated_by: str,
    bypass_cutoff: bool = False,
) -> str:
    """Set work location across every day in [start_date, end_date]."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        return "Invalid date format. Use YYYY-MM-DD."
    if start > end:
        return "Start date must be on or before end date."

    updated, skipped = 0, []
    current = start
    while current <= end:
        date_str = str(current)
        result = update_location(date_str, user_id, location, updated_by=updated_by, bypass_cutoff=bypass_cutoff)
        if result.startswith("Cannot") or result.startswith("Cut-off") or result.startswith("Invalid"):
            skipped.append(date_str)
        else:
            updated += 1
        current += timedelta(days=1)

    msg = f"Location set to **{location.upper()}** for {updated} day(s) between {start_date} and {end_date}."
    if skipped:
        preview = ", ".join(skipped[:3]) + ("…" if len(skipped) > 3 else "")
        msg += f"\nSkipped {len(skipped)} day(s) past cut-off: {preview}"
    return msg


def get_monthly_wfh_summary(month_prefix: str) -> dict[str, int]:
    """Return WFH day counts per user for a given month (YYYY-MM).

    Queries each day's LOC# partition up to today and aggregates counts.
    Team-scoped filtering is deferred until team membership data exists.
    """
    try:
        year, month = map(int, month_prefix.split("-"))
    except ValueError:
        return {}

    days_in_month = calendar.monthrange(year, month)[1]
    today = _date.today()
    wfh_counts: dict[str, int] = {}

    for day in range(1, days_in_month + 1):
        d = _date(year, month, day)
        if d > today:
            break
        try:
            response = _table.query(KeyConditionExpression=Key("PK").eq(f"LOC#{d}"))
            for item in response.get("Items", []):
                if item.get("work_location") == "WFH":
                    uid = item["user_id"]
                    wfh_counts[uid] = wfh_counts.get(uid, 0) + 1
        except ClientError as e:
            logger.error("DynamoDB query failed for LOC#%s: %s", d, e)

    return wfh_counts
