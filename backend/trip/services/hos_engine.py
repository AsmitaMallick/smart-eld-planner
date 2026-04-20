from datetime import datetime, timedelta


AVG_SPEED = 55.0
MAX_DRIVING_HOURS_PER_DAY = 11.0
MAX_DRIVING_WINDOW_HOURS = 14.0
BREAK_REQUIRED_AFTER_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5
DAILY_RESET_HOURS = 10.0
WEEKLY_LIMIT_HOURS = 70.0
FUEL_STOP_EVERY_MILES = 1000.0
FUEL_STOP_DURATION_HOURS = 0.5
PRETRIP_INSPECTION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1.0
DROPOFF_DURATION_HOURS = 1.0
EPSILON = 1e-9

SCHEDULE_START = datetime(2025, 1, 1, 6, 0, 0)


def _round_segment(segment):
    return {
        "start_time": segment["start_time"],
        "end_time": segment["end_time"],
        "duration_hours": round(float(segment["duration_hours"]), 6),
        "status": segment["status"],
        "event_type": segment["event_type"],
        "location": segment.get("location"),
        "miles": round(float(segment.get("miles", 0.0)), 6),
    }


def calculate_day(start_time, schedule_start):
    delta = start_time.date() - schedule_start.date()
    return delta.days + 1


def map_event_title(segment):
    event_type = segment.get("event_type")
    status = segment.get("status")

    if event_type == "pickup":
        return "Pickup"
    if event_type == "dropoff":
        return "Dropoff"
    if event_type == "fuel":
        return "Fuel Stop"
    if event_type == "reset":
        return "10h Reset"
    if event_type == "end_of_trip_rest":
        return "End of Trip Rest"
    if event_type == "cycle_reset":
        return "34h Cycle Reset"
    if event_type == "inspection":
        return "Inspection"
    if event_type == "rest":
        return "Rest Break"
    if status == "driving":
        return "Driving"
    if status == "on_duty":
        return "On Duty"
    if status == "sleeper":
        return "Sleeper Berth"
    if status == "off_duty":
        return "Off Duty"
    return "Duty Segment"


def _split_segment_by_day(segment):
    chunks = []
    cursor = segment["start_time"]
    end_time = segment["end_time"]

    while cursor < end_time:
        next_midnight = datetime(cursor.year, cursor.month, cursor.day) + timedelta(days=1)
        chunk_end = min(end_time, next_midnight)
        duration_hours = (chunk_end - cursor).total_seconds() / 3600.0
        if duration_hours > EPSILON:
            chunks.append(
                {
                    "start_time": cursor,
                    "end_time": chunk_end,
                    "duration_hours": duration_hours,
                    "status": segment["status"],
                    "event_type": segment["event_type"],
                    "location": segment.get("location"),
                }
            )
        cursor = chunk_end

    return chunks


def build_timeline(schedule):
    if not schedule:
        return []

    timeline = []
    schedule_start = schedule[0]["start_time"]

    for segment in schedule:
        for chunk in _split_segment_by_day(segment):
            start_time = chunk["start_time"]
            timeline.append(
                {
                    "time": start_time,
                    "day": calculate_day(start_time, schedule_start),
                    "title": map_event_title(chunk),
                    "duration": round(float(chunk["duration_hours"]), 6),
                    "type": chunk["event_type"],
                    "status": chunk["status"],
                }
            )

    return timeline


def calculate_schedule(leg1_miles, leg2_miles, current_cycle_used):
    leg1 = float(leg1_miles)
    leg2 = float(leg2_miles)
    cycle_used = float(current_cycle_used)

    if leg1 < 0 or leg2 < 0:
        raise ValueError("Leg miles cannot be negative")
    if cycle_used < 0:
        raise ValueError("Current cycle used cannot be negative")
    if cycle_used > WEEKLY_LIMIT_HOURS + EPSILON:
        raise ValueError("Current cycle used exceeds 70-hour cycle cap")

    total_miles = leg1 + leg2
    if total_miles <= EPSILON:
        return []

    current_time = SCHEDULE_START
    schedule = []
    total_miles_driven = 0.0
    miles_since_fuel = 0.0
    leg1_completed = False
    day_driving_hours = 0.0
    driving_since_break = 0.0
    duty_window_elapsed = 0.0
    # CHANGED: do not force a reset at schedule start; begin with pretrip when duty starts.
    needs_pretrip = True

    def append_segment(status, event_type, duration_hours, miles=0.0, location=None):
        nonlocal current_time
        if duration_hours <= EPSILON:
            raise ValueError(f"Invalid non-positive segment duration for {event_type}")

        start_time = current_time
        end_time = current_time + timedelta(hours=float(duration_hours))
        schedule.append(
            {
                "start_time": start_time,
                "end_time": end_time,
                "duration_hours": float(duration_hours),
                "status": status,
                "event_type": event_type,
                "location": location,
                "miles": float(miles),
            }
        )
        current_time = end_time

    def remaining_cycle_hours():
        return WEEKLY_LIMIT_HOURS - cycle_used

    def apply_reset():
        nonlocal day_driving_hours, driving_since_break, duty_window_elapsed, needs_pretrip
        append_segment("sleeper", "reset", DAILY_RESET_HOURS)
        day_driving_hours = 0.0
        driving_since_break = 0.0
        duty_window_elapsed = 0.0
        needs_pretrip = True

    def apply_cycle_reset():
        # CHANGED: 34-hour cycle reset helper with defensive duplicate protection.
        nonlocal cycle_used, day_driving_hours, driving_since_break, duty_window_elapsed, needs_pretrip
        # FIX: prevent back-to-back cycle_reset segments.
        if schedule and schedule[-1].get("event_type") == "cycle_reset":
            return False
        append_segment("sleeper", "cycle_reset", 34.0)
        # FIX: cycle reset restores available capacity/state.
        cycle_used = 0.0
        day_driving_hours = 0.0
        driving_since_break = 0.0
        duty_window_elapsed = 0.0
        needs_pretrip = True
        return True

    def ensure_cycle_capacity(required_hours):
        # CHANGED: cycle limit now triggers a 34-hour reset instead of terminating schedule.
        if required_hours <= EPSILON:
            return
        if remaining_cycle_hours() < required_hours - EPSILON:
            # FIX: only reset when cycle has actually been consumed.
            if cycle_used > EPSILON:
                apply_cycle_reset()

    def append_non_driving(status, event_type, duration_hours):
        nonlocal cycle_used, duty_window_elapsed, driving_since_break

        # CHANGED: cycle capacity enforcement for non-driving duty events.
        if status in {"driving", "on_duty"}:
            ensure_cycle_capacity(duration_hours)

        if status in {"driving", "on_duty", "off_duty"} and duty_window_elapsed + duration_hours > MAX_DRIVING_WINDOW_HOURS + EPSILON:
            apply_reset()

        # CHANGED: if we reset above, re-check cycle capacity against fresh state.
        if status in {"driving", "on_duty"}:
            ensure_cycle_capacity(duration_hours)

        if status in {"driving", "on_duty", "off_duty"} and duty_window_elapsed + duration_hours > MAX_DRIVING_WINDOW_HOURS + EPSILON:
            raise ValueError("Unable to schedule duty event within 14-hour window")

        append_segment(status, event_type, duration_hours)

        if status in {"driving", "on_duty", "off_duty"}:
            duty_window_elapsed += duration_hours

        # CHANGED: 70-hour cycle tracks driving/on-duty, not off-duty breaks.
        if status in {"driving", "on_duty"}:
            cycle_used += duration_hours

        if duration_hours >= BREAK_DURATION_HOURS - EPSILON:
            driving_since_break = 0.0

    # CHANGED: only apply cycle reset at start when no cycle capacity remains.
    if remaining_cycle_hours() <= EPSILON:
        apply_cycle_reset()

    # CHANGED: defensive progress guard against infinite loops.
    no_drive_iterations = 0
    max_no_drive_iterations = 1000

    while total_miles_driven < total_miles - EPSILON:
        # FIX: detect repeated iterations with no driving progress.
        no_drive_iterations += 1
        if no_drive_iterations > max_no_drive_iterations:
            raise ValueError("Unable to progress schedule: no driving progress across many iterations")

        if needs_pretrip:
            append_non_driving("on_duty", "inspection", PRETRIP_INSPECTION_HOURS)
            needs_pretrip = False
            continue

        if not leg1_completed and total_miles_driven >= leg1 - EPSILON:
            append_non_driving("on_duty", "pickup", PICKUP_DURATION_HOURS)
            leg1_completed = True
            continue

        if miles_since_fuel >= FUEL_STOP_EVERY_MILES - EPSILON:
            append_non_driving("on_duty", "fuel", FUEL_STOP_DURATION_HOURS)
            miles_since_fuel = 0.0
            continue

        if day_driving_hours >= MAX_DRIVING_HOURS_PER_DAY - EPSILON:
            apply_reset()
            continue

        if duty_window_elapsed >= MAX_DRIVING_WINDOW_HOURS - EPSILON:
            apply_reset()
            continue

        if driving_since_break >= BREAK_REQUIRED_AFTER_HOURS - EPSILON:
            append_non_driving("off_duty", "rest", BREAK_DURATION_HOURS)
            continue

        miles_remaining = total_miles - total_miles_driven
        miles_until_pickup = float("inf")
        if not leg1_completed:
            miles_until_pickup = max(0.0, leg1 - total_miles_driven)
        miles_until_fuel = max(0.0, FUEL_STOP_EVERY_MILES - miles_since_fuel)

        hours_until_day_limit = max(0.0, MAX_DRIVING_HOURS_PER_DAY - day_driving_hours)
        hours_until_window_limit = max(0.0, MAX_DRIVING_WINDOW_HOURS - duty_window_elapsed)
        hours_until_break = max(0.0, BREAK_REQUIRED_AFTER_HOURS - driving_since_break)

        drive_hours = min(
            hours_until_day_limit,
            hours_until_window_limit,
            hours_until_break,
            miles_until_fuel / AVG_SPEED,
            miles_remaining / AVG_SPEED,
            miles_until_pickup / AVG_SPEED,
        )

        if drive_hours <= EPSILON:
            if miles_until_pickup <= EPSILON and not leg1_completed:
                append_non_driving("on_duty", "pickup", PICKUP_DURATION_HOURS)
                leg1_completed = True
                continue
            if miles_until_fuel <= EPSILON:
                append_non_driving("on_duty", "fuel", FUEL_STOP_DURATION_HOURS)
                miles_since_fuel = 0.0
                continue
            if hours_until_break <= EPSILON:
                append_non_driving("off_duty", "rest", BREAK_DURATION_HOURS)
                continue
            if hours_until_day_limit <= EPSILON or hours_until_window_limit <= EPSILON:
                apply_reset()
                continue
            raise ValueError("Unable to advance schedule due to precision constraints")

        if remaining_cycle_hours() < drive_hours - EPSILON:
            # CHANGED: convert cycle shortage into intelligent 34-hour reset.
            # FIX: avoid repeated reset loops when cycle_used is already zero.
            if cycle_used > EPSILON:
                apply_cycle_reset()
                continue
            raise ValueError("Unable to progress schedule: insufficient cycle capacity for driving segment")

        drive_miles = drive_hours * AVG_SPEED
        append_segment("driving", "drive", drive_hours, miles=drive_miles)

        total_miles_driven += drive_miles
        miles_since_fuel += drive_miles
        day_driving_hours += drive_hours
        driving_since_break += drive_hours
        duty_window_elapsed += drive_hours
        cycle_used += drive_hours
        no_drive_iterations = 0

    if not leg1_completed and total_miles_driven >= leg1 - EPSILON:
        append_non_driving("on_duty", "pickup", PICKUP_DURATION_HOURS)
        leg1_completed = True

    append_non_driving("on_duty", "dropoff", DROPOFF_DURATION_HOURS)
    append_segment("sleeper", "end_of_trip_rest", DAILY_RESET_HOURS)

    rounded_schedule = [_round_segment(segment) for segment in schedule]
    validate_schedule(rounded_schedule)
    return rounded_schedule


def validate_schedule(schedule):
    if not schedule:
        return True

    pickup_count = 0
    dropoff_count = 0
    day_driving_hours = 0.0
    driving_since_break = 0.0
    duty_window_elapsed = 0.0

    previous_end = None
    for index, segment in enumerate(schedule):
        status = segment.get("status")
        event_type = segment.get("event_type")
        start_time = segment.get("start_time")
        end_time = segment.get("end_time")

        if not isinstance(start_time, datetime) or not isinstance(end_time, datetime):
            raise ValueError(f"Segment {index} has invalid datetime fields")

        duration = (end_time - start_time).total_seconds() / 3600.0
        if duration <= EPSILON:
            raise ValueError(f"Segment {index} has non-positive duration")

        if previous_end is not None and abs((start_time - previous_end).total_seconds()) > 1e-3:
            if start_time > previous_end:
                raise ValueError(f"Gap before segment {index}")
            raise ValueError(f"Overlap before segment {index}")
        previous_end = end_time

        if event_type == "pickup":
            pickup_count += 1
        if event_type == "dropoff":
            dropoff_count += 1

        if event_type == "reset" and status == "sleeper" and duration >= DAILY_RESET_HOURS - EPSILON:
            day_driving_hours = 0.0
            driving_since_break = 0.0
            duty_window_elapsed = 0.0
            continue

        # CHANGED: 34-hour cycle reset also resets active-duty counters.
        if event_type == "cycle_reset" and status == "sleeper" and duration >= 34.0 - EPSILON:
            day_driving_hours = 0.0
            driving_since_break = 0.0
            duty_window_elapsed = 0.0
            continue

        if status == "driving":
            day_driving_hours += duration
            driving_since_break += duration
            duty_window_elapsed += duration
            if driving_since_break > BREAK_REQUIRED_AFTER_HOURS + 1e-6:
                raise ValueError("Driving exceeds 8 hours without a required 30-min break")
            if day_driving_hours > MAX_DRIVING_HOURS_PER_DAY + 1e-6:
                raise ValueError("Driving exceeds 11-hour daily limit")
            if duty_window_elapsed > MAX_DRIVING_WINDOW_HOURS + 1e-6:
                raise ValueError("Driving exceeds 14-hour duty window")
            # if driving_since_break > BREAK_REQUIRED_AFTER_HOURS + 1e-6:
            #     raise ValueError("Driving exceeds 8 hours without a required 30-min break")
            continue

        if status in {"on_duty", "off_duty"}:
            duty_window_elapsed += duration
            if duty_window_elapsed > MAX_DRIVING_WINDOW_HOURS + 1e-6:
                raise ValueError("Duty event exceeds 14-hour duty window")
            if duration >= BREAK_DURATION_HOURS - EPSILON:
                driving_since_break = 0.0

    if pickup_count != 1:
        raise ValueError("Schedule must contain exactly one pickup event")
    if dropoff_count != 1:
        raise ValueError("Schedule must contain exactly one dropoff event")

    return True


def run_sanity_tests():
    cases = [
        ("Short trip (no break)", 120.0, 80.0, 0.0),
        ("Medium trip (1 break)", 500.0, 0.0, 0.0),
        ("Long trip (multi-day)", 1400.0, 800.0, 0.0),
        ("Trip with fuel stops", 1200.0, 900.0, 0.0),
    ]

    for title, leg1, leg2, cycle in cases:
        print(f"\n=== {title} ===")
        schedule = calculate_schedule(leg1, leg2, cycle)
        validate_schedule(schedule)
        for segment in schedule:
            print(segment)
