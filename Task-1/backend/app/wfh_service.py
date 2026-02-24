import calendar
from datetime import datetime
from typing import Dict, List


def calculate_wfh_days_current_month(user_id: int, work_locations: List[Dict]) -> int:
    """
    Count explicit WFH days for a user in the current calendar month.

    Optimised: only inspects records whose date falls within the current month
    (month_start <= date <= month_end), avoiding a full history scan.

    Args:
        user_id: The employee's user ID.
        work_locations: The full list of work_location records from storage.

    Returns:
        Number of days this month where location == 'WFH'.
    """
    today = datetime.now()
    year = today.year
    month = today.month

    month_start = f"{year}-{month:02d}-01"
    last_day = calendar.monthrange(year, month)[1]
    month_end = f"{year}-{month:02d}-{last_day:02d}"

    count = 0
    for loc in work_locations:
        if (
            loc.get("user_id") == user_id
            and loc.get("location") == "WFH"
            and month_start <= (loc.get("date") or "") <= month_end
        ):
            count += 1
    return count
