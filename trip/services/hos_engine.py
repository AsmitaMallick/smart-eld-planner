AVG_SPEED = 55
MAX_DRIVING_HOURS_PER_DAY = 11
MAX_DRIVING_WINDOW_HOURS = 14
BREAK_REQUIRED_AFTER_HOURS = 8
BREAK_DURATION_HOURS = 0.5
DAILY_RESET_HOURS = 10
WEEKLY_LIMIT_HOURS = 70
FUEL_STOP_EVERY_MILES = 1000
FUEL_STOP_DURATION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1
DROPOFF_DURATION_HOURS = 1


def _event(event_type, duration_hrs, miles, notes):
    return {
        "type": event_type,
        "duration_hrs": round(float(duration_hrs), 3),
        "miles": round(float(miles), 3),
        "notes": notes,
    }


def calculate_schedule(leg1_miles, leg2_miles, current_cycle_used):
    total_miles = float(leg1_miles) + float(leg2_miles)
    if total_miles <= 0:
        return []

    remaining_cycle_hours = max(0.0, WEEKLY_LIMIT_HOURS - float(current_cycle_used))
    planned_drive_hours = min(float(total_miles) / AVG_SPEED, remaining_cycle_hours)
    if planned_drive_hours <= 0:
        return []

    remaining_miles = planned_drive_hours * AVG_SPEED

    schedule = [
        _event("off_duty", DAILY_RESET_HOURS, 0, "Pre-trip rest"),
        _event("on_duty_nd", PICKUP_DURATION_HOURS, 0, "Pickup"),
    ]

    day_driving_hours = 0.0
    driving_since_break = 0.0
    miles_since_fuel = 0.0
    window_remaining = MAX_DRIVING_WINDOW_HOURS - PICKUP_DURATION_HOURS

    while remaining_miles > 1e-9:
        if driving_since_break >= BREAK_REQUIRED_AFTER_HOURS - 1e-9:
            if window_remaining < BREAK_DURATION_HOURS:
                schedule.append(_event("rest", DAILY_RESET_HOURS, 0, "10-hr reset"))
                day_driving_hours = 0.0
                driving_since_break = 0.0
                window_remaining = MAX_DRIVING_WINDOW_HOURS
                continue

            schedule.append(_event("break", BREAK_DURATION_HOURS, 0, "30-min required break"))
            driving_since_break = 0.0
            window_remaining -= BREAK_DURATION_HOURS
            continue

        max_drive_hours = min(
            MAX_DRIVING_HOURS_PER_DAY - day_driving_hours,
            window_remaining,
            BREAK_REQUIRED_AFTER_HOURS - driving_since_break,
            (FUEL_STOP_EVERY_MILES - miles_since_fuel) / AVG_SPEED,
            remaining_miles / AVG_SPEED,
        )

        if max_drive_hours <= 1e-9:
            if miles_since_fuel >= FUEL_STOP_EVERY_MILES - 1e-9:
                if window_remaining < FUEL_STOP_DURATION_HOURS:
                    schedule.append(_event("rest", DAILY_RESET_HOURS, 0, "10-hr reset"))
                    day_driving_hours = 0.0
                    driving_since_break = 0.0
                    window_remaining = MAX_DRIVING_WINDOW_HOURS
                    continue

                schedule.append(
                    _event(
                        "on_duty_nd",
                        FUEL_STOP_DURATION_HOURS,
                        0,
                        "Fuel stop",
                    )
                )
                miles_since_fuel = 0.0
                window_remaining -= FUEL_STOP_DURATION_HOURS
                continue

            schedule.append(_event("rest", DAILY_RESET_HOURS, 0, "10-hr reset"))
            day_driving_hours = 0.0
            driving_since_break = 0.0
            window_remaining = MAX_DRIVING_WINDOW_HOURS
            continue

        driving_miles = max_drive_hours * AVG_SPEED
        schedule.append(_event("driving", max_drive_hours, driving_miles, ""))

        remaining_miles -= driving_miles
        day_driving_hours += max_drive_hours
        driving_since_break += max_drive_hours
        miles_since_fuel += driving_miles
        window_remaining -= max_drive_hours

    if window_remaining < DROPOFF_DURATION_HOURS:
        schedule.append(_event("rest", DAILY_RESET_HOURS, 0, "10-hr reset"))

    schedule.append(_event("on_duty_nd", DROPOFF_DURATION_HOURS, 0, "Dropoff"))

    return schedule
