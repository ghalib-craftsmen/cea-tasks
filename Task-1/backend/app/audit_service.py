from datetime import datetime, timezone
from typing import Optional
from app.db import JSONStorage

_storage = JSONStorage()


def log_audit(
    actor_user_id: int,
    target_user_id: int,
    action_type: str,
    new_value: str,
    date: Optional[str] = None,
) -> None:
    """
    Append an immutable audit record to audit_logs.json.

    action_type conventions:
      meal_update   – participation row changed
      opt_in        – all meals opted in (bulk)
      opt_out       – all meals opted out (bulk)
      location_change – work location changed
    """
    audit_logs = _storage.read_audit_logs()
    new_id = max((log.get("id", 0) for log in audit_logs), default=0) + 1
    entry = {
        "id": new_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor_user_id": actor_user_id,
        "target_user_id": target_user_id,
        "action_type": action_type,
        "new_value": new_value,
        "date": date,
    }
    audit_logs.append(entry)
    _storage.write_audit_logs(audit_logs)
