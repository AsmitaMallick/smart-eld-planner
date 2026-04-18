from typing import Dict, List


MINUTES_PER_DAY = 24 * 60
START_MINUTE_DAY_ONE = 6 * 60


def _to_hhmm(minute_of_day: int) -> str:
    hours = minute_of_day // 60
    minutes = minute_of_day % 60
    return f"{hours:02d}:{minutes:02d}"


def _status_for_event(event_type: str) -> str:
    if event_type == "driving":
        return "driving"
    if event_type in {"on_duty_nd", "break"}:
        return "on_duty_not_driving"
    if event_type in {"rest", "off_duty"}:
        return "off_duty"
    return "off_duty"


def _new_day(day_number: int) -> Dict:
    return {
        "day": day_number,
        "date_label": f"Day {day_number}",
        "entries": [],
        "totals": {
            "off_duty": 0.0,
            "sleeper_berth": 0,
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
    elif status == "driving":
        day["totals"]["driving"] += duration_hours
    elif status == "on_duty_not_driving":
        day["totals"]["on_duty_not_driving"] += duration_hours


def build_eld_logs(schedule: list[dict]) -> list[dict]:
    if not schedule:
        return []

    days: List[Dict] = []
    current_day_number = 1
    current_day = _new_day(current_day_number)
    days.append(current_day)

    _add_entry(current_day, "off_duty", 0, START_MINUTE_DAY_ONE)
    absolute_minute = START_MINUTE_DAY_ONE

    for event in schedule:
        event_type = event.get("type", "off_duty")
        status = _status_for_event(event_type)
        duration_minutes = int(round(float(event.get("duration_hrs", 0)) * 60))
        if duration_minutes <= 0:
            continue

        notes = (event.get("notes") or "").strip()
        if notes:
            start_minute_of_day = absolute_minute % MINUTES_PER_DAY
            current_day["remarks"].append(f"{_to_hhmm(start_minute_of_day)} - {notes}")

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
        day["totals"]["driving"] = round(day["totals"]["driving"], 3)
        day["totals"]["on_duty_not_driving"] = round(day["totals"]["on_duty_not_driving"], 3)

    return days
