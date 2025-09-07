from datetime import datetime, timedelta
from typing import Optional

# Pure function to calculate next service date based on install date, usage hours and model
# Returns a datetime representing the next service date

MODEL_SERVICE_INTERVAL_HOURS = {
    "AIM 7420": 500,
    "CDC 600": 300,
}

DEFAULT_MONTHS_IF_NO_USAGE = 6


def calculate_next_service(date_installed: datetime, usage_hours: Optional[float], machine_model: str) -> datetime:
    now = datetime.utcnow()

    # determine service interval in hours
    interval_hours = MODEL_SERVICE_INTERVAL_HOURS.get(machine_model, None)

    if interval_hours is None:
        # default to 400 hours if model unknown
        interval_hours = 400

    if usage_hours is None or usage_hours <= 0:
        # fallback to adding DEFAULT_MONTHS_IF_NO_USAGE months
        try:
            next_date = date_installed + timedelta(days=30 * DEFAULT_MONTHS_IF_NO_USAGE)
        except Exception:
            next_date = now + timedelta(days=30 * DEFAULT_MONTHS_IF_NO_USAGE)
        return next_date

    # estimate hours per day based on time since install
    days_since_install = max((now - date_installed).days, 1)
    avg_hours_per_day = usage_hours / days_since_install

    # if avg_hours_per_day is zero or extremely small, fallback to months
    if avg_hours_per_day < 0.01:
        return date_installed + timedelta(days=30 * DEFAULT_MONTHS_IF_NO_USAGE)

    days_until_next = (interval_hours - usage_hours) / avg_hours_per_day

    if days_until_next <= 0:
        # overdue - schedule immediately
        return now

    return now + timedelta(days=days_until_next)
