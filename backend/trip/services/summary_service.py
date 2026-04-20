from datetime import date, datetime


def _calculate_estimated_days(schedule):
    if not schedule:
        return 0

    # Prefer timeline-style day values when available.
    day_values = []
    for event in schedule:
        day_value = event.get("day")
        if day_value is None:
            continue
        try:
            day_number = int(day_value)
        except (TypeError, ValueError):
            continue
        if day_number > 0:
            day_values.append(day_number)

    if day_values:
        return max(day_values)

    # Fall back to schedule datetimes to mirror ELD day splitting.
    start_dates = []
    for event in schedule:
        start_value = event.get("start_time")
        if isinstance(start_value, datetime):
            start_dates.append(start_value.date())
        elif isinstance(start_value, date):
            start_dates.append(start_value)

    if not start_dates:
        return 0

    schedule_start = start_dates[0]
    return max((segment_date - schedule_start).days + 1 for segment_date in start_dates)


def calculate_summary(schedule, total_miles):
    miles_value = float(total_miles or 0.0)

    if not schedule:
        return {
            "total_miles": miles_value,
            "estimated_days": 0,
            "total_drive_hours": 0.0,
            "rest_stops": 0,
        }

    countable_rest_event_types = {"rest", "reset", "cycle_reset"}
    rest_stops = sum(
        1
        for event in schedule
        if event.get("event_type") in countable_rest_event_types
        or event.get("type") in countable_rest_event_types
    )

    total_drive_hours = sum(
        float(
            event.get(
                "duration_hours",
                event.get(
                    "duration_hrs",
                    float(event.get("end", 0.0) or 0.0) - float(event.get("start", 0.0) or 0.0),
                ),
            )
            or 0.0
        )
        for event in schedule
        if event.get("status") == "driving" or event.get("type") == "driving"
    )

    estimated_days = _calculate_estimated_days(schedule)

    return {
        "total_miles": miles_value,
        "estimated_days": int(estimated_days),
        "total_drive_hours": float(total_drive_hours),
        "rest_stops": int(rest_stops),
    }
