from datetime import datetime
from typing import Dict, List


MINUTES_PER_DAY = 24 * 60


def _to_hhmm(minute_of_day: int) -> str:
    hours = minute_of_day // 60
    minutes = minute_of_day % 60
    return f"{hours:02d}:{minutes:02d}"


def _to_status(schedule_status: str) -> str:
    if schedule_status == "driving":
        return "driving"
    if schedule_status == "on_duty":
        return "on_duty_not_driving"
    if schedule_status == "sleeper":
        return "sleeper_berth"
    if schedule_status == "off_duty":
        return "off_duty"
    return "off_duty"


def _new_day(day_number: int) -> Dict:
    return {
        "day": day_number,
        "date_label": f"Day {day_number}",
        "entries": [],
        "totals": {
            "off_duty": 0.0,
            "sleeper_berth": 0.0,
            "driving": 0.0,
            "on_duty_not_driving": 0.0,
        },
        "remarks": [],
    }


def _add_entry(day: Dict, status: str, start_minute: int, end_minute: int) -> None:
    day["entries"].append(
        {
            "status": status,
            "start_time": _to_hhmm(start_minute),
            "end_time": _to_hhmm(end_minute),
        }
    )

    duration_hours = (end_minute - start_minute) / 60.0
    if status == "off_duty":
        day["totals"]["off_duty"] += duration_hours
    elif status == "sleeper_berth":
        day["totals"]["sleeper_berth"] += duration_hours
    elif status == "driving":
        day["totals"]["driving"] += duration_hours
    elif status == "on_duty_not_driving":
        day["totals"]["on_duty_not_driving"] += duration_hours


def _remark_for_segment(segment: dict) -> str:
    event_type = segment.get("event_type")
    if event_type == "pickup":
        return "Pickup"
    if event_type == "dropoff":
        return "Dropoff"
    if event_type == "fuel":
        return "Fuel stop"
    if event_type == "inspection":
        return "Pre-trip inspection"
    if event_type == "rest":
        return "30-min required break"
    if event_type == "reset":
        return "Start of 10-hr reset"
    return ""


def _minutes_since_start(start_time: datetime, anchor: datetime) -> int:
    return int(round((start_time - anchor).total_seconds() / 60.0))


def build_eld_logs(schedule: list[dict]) -> list[dict]:
    if not schedule:
        return []

    days: List[Dict] = []
    current_day_number = 1
    current_day = _new_day(current_day_number)
    days.append(current_day)

    anchor = schedule[0]["start_time"]
    if not isinstance(anchor, datetime):
        raise ValueError("Schedule start_time must be datetime")

    for segment in schedule:
        segment_start = segment.get("start_time")
        segment_end = segment.get("end_time")
        if not isinstance(segment_start, datetime) or not isinstance(segment_end, datetime):
            raise ValueError("Schedule segment times must be datetime")

        absolute_minute = _minutes_since_start(segment_start, anchor)
        duration_minutes = int(round((segment_end - segment_start).total_seconds() / 60.0))
        if duration_minutes <= 0:
            continue

        status = _to_status(segment.get("status"))
        required_day_number = (absolute_minute // MINUTES_PER_DAY) + 1
        if required_day_number > current_day_number:
            current_day_number = required_day_number
            current_day = _new_day(current_day_number)
            days.append(current_day)

        remark = _remark_for_segment(segment)
        if remark:
            start_minute_of_day = absolute_minute % MINUTES_PER_DAY
            current_day["remarks"].append(f"{_to_hhmm(start_minute_of_day)} - {remark}")

        remaining = duration_minutes
        while remaining > 0:
            required_day_number = (absolute_minute // MINUTES_PER_DAY) + 1
            if required_day_number > current_day_number:
                current_day_number = required_day_number
                current_day = _new_day(current_day_number)
                days.append(current_day)

            minute_of_day = absolute_minute % MINUTES_PER_DAY
            space_until_midnight = MINUTES_PER_DAY - minute_of_day
            chunk = min(remaining, space_until_midnight)

            _add_entry(current_day, status, minute_of_day, minute_of_day + chunk)

            absolute_minute += chunk
            remaining -= chunk

    for day in days:
        day["totals"]["off_duty"] = round(day["totals"]["off_duty"], 3)
        day["totals"]["sleeper_berth"] = round(day["totals"]["sleeper_berth"], 3)
        day["totals"]["driving"] = round(day["totals"]["driving"], 3)
        day["totals"]["on_duty_not_driving"] = round(day["totals"]["on_duty_not_driving"], 3)

    return days
