def calculate_summary(schedule, total_miles):
    miles_value = float(total_miles or 0.0)

    if not schedule:
        return {
            "total_miles": miles_value,
            "estimated_days": 0,
            "total_drive_hours": 0.0,
            "rest_stops": 0,
        }

    rest_stops = sum(
        1
        for event in schedule
        if event.get("event_type") in {"rest", "reset"}
        or event.get("type") == "rest"
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

    estimated_days = rest_stops + 1

    return {
        "total_miles": miles_value,
        "estimated_days": int(estimated_days),
        "total_drive_hours": float(total_drive_hours),
        "rest_stops": int(rest_stops),
    }
