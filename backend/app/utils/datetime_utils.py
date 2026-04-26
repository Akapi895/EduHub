from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings


_FIXED_TIMEZONE_FALLBACKS = {
    "Asia/Ho_Chi_Minh": timezone(timedelta(hours=7)),
    "Asia/Saigon": timezone(timedelta(hours=7)),
}


def get_app_timezone():
    try:
        return ZoneInfo(settings.app_timezone)
    except ZoneInfoNotFoundError:
        return _FIXED_TIMEZONE_FALLBACKS.get(
            settings.app_timezone,
            datetime.now().astimezone().tzinfo or timezone.utc,
        )


def now_local_naive() -> datetime:
    return datetime.now(get_app_timezone()).replace(tzinfo=None)


def to_local_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(get_app_timezone()).replace(tzinfo=None)
