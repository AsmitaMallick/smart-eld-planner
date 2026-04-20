from datetime import timedelta

from django.test import SimpleTestCase

from trip.services.hos_engine import (
    BREAK_DURATION_HOURS,
    BREAK_REQUIRED_AFTER_HOURS,
    DAILY_RESET_HOURS,
    FUEL_STOP_EVERY_MILES,
    MAX_DRIVING_HOURS_PER_DAY,
    build_timeline,
    calculate_schedule,
    validate_schedule,
)


class HosEngineTests(SimpleTestCase):
    def test_30_min_break_triggered_after_8_hours_driving(self):
        schedule = calculate_schedule(leg1_miles=500, leg2_miles=0, current_cycle_used=0)

        break_events = [event for event in schedule if event["event_type"] == "rest"]
        self.assertTrue(break_events)

        first_break = break_events[0]
        self.assertAlmostEqual(first_break["duration_hours"], BREAK_DURATION_HOURS, places=6)

    def test_10_hour_reset_triggered_when_daily_driving_limit_reached(self):
        schedule = calculate_schedule(leg1_miles=700, leg2_miles=0, current_cycle_used=0)

        reset_events = [
            event for event in schedule if event["event_type"] == "reset" and event["status"] == "sleeper"
        ]
        self.assertTrue(reset_events)
        self.assertAlmostEqual(reset_events[0]["duration_hours"], DAILY_RESET_HOURS, places=6)

    def test_events_include_normalized_fields(self):
        schedule = calculate_schedule(leg1_miles=250, leg2_miles=150, current_cycle_used=0)

        self.assertTrue(schedule)
        for event in schedule:
            self.assertIn("start_time", event)
            self.assertIn("end_time", event)
            self.assertIn("duration_hours", event)
            self.assertIn("status", event)
            self.assertIn("event_type", event)
            self.assertGreaterEqual(event["end_time"], event["start_time"])

    def test_events_are_continuous_without_gaps_or_overlaps(self):
        schedule = calculate_schedule(leg1_miles=900, leg2_miles=300, current_cycle_used=0)

        self.assertTrue(schedule)
        for prev_event, next_event in zip(schedule, schedule[1:]):
            self.assertEqual(prev_event["end_time"], next_event["start_time"])

    def test_pickup_and_dropoff_exist_exactly_once(self):
        schedule = calculate_schedule(leg1_miles=350, leg2_miles=650, current_cycle_used=0)

        pickup_events = [event for event in schedule if event["event_type"] == "pickup"]
        dropoff_events = [event for event in schedule if event["event_type"] == "dropoff"]

        self.assertEqual(len(pickup_events), 1)
        self.assertEqual(len(dropoff_events), 1)
        self.assertLess(pickup_events[0]["start_time"], dropoff_events[0]["start_time"])

    def test_fuel_stop_inserted_at_1000_miles(self):
        schedule = calculate_schedule(leg1_miles=1300, leg2_miles=500, current_cycle_used=0)

        miles_progress = 0.0
        fuel_at = []
        for event in schedule:
            if event["status"] == "driving":
                miles_progress += event["miles"]
            if event["event_type"] == "fuel":
                fuel_at.append(miles_progress)

        self.assertTrue(fuel_at)
        self.assertAlmostEqual(fuel_at[0], FUEL_STOP_EVERY_MILES, places=6)

    def test_validator_accepts_generated_schedule(self):
        schedule = calculate_schedule(leg1_miles=600, leg2_miles=200, current_cycle_used=0)
        self.assertTrue(validate_schedule(schedule))

    def test_validator_rejects_gap(self):
        schedule = calculate_schedule(leg1_miles=200, leg2_miles=100, current_cycle_used=0)
        broken = [dict(event) for event in schedule]
        broken[2]["start_time"] = broken[2]["start_time"] + timedelta(minutes=6)

        with self.assertRaises(ValueError):
            validate_schedule(broken)

    def test_no_more_than_11_hours_driving_before_reset(self):
        schedule = calculate_schedule(leg1_miles=1500, leg2_miles=0, current_cycle_used=0)

        driving_today = 0.0
        for event in schedule:
            if event["event_type"] == "reset" and event["status"] == "sleeper":
                driving_today = 0.0
                continue
            if event["status"] == "driving":
                driving_today += event["duration_hours"]
                self.assertLessEqual(driving_today, MAX_DRIVING_HOURS_PER_DAY + 1e-6)

    def test_break_appears_before_driving_exceeds_8_hours(self):
        schedule = calculate_schedule(leg1_miles=1000, leg2_miles=0, current_cycle_used=0)

        driving_since_break = 0.0
        for event in schedule:
            if event["status"] == "driving":
                driving_since_break += event["duration_hours"]
                self.assertLessEqual(driving_since_break, BREAK_REQUIRED_AFTER_HOURS + 1e-6)
            elif event["duration_hours"] >= BREAK_DURATION_HOURS - 1e-9:
                driving_since_break = 0.0

    def test_timeline_contains_every_schedule_segment(self):
        schedule = calculate_schedule(leg1_miles=800, leg2_miles=400, current_cycle_used=0)
        timeline = build_timeline(schedule)
        self.assertGreaterEqual(len(timeline), len(schedule))

    def test_timeline_includes_post_dropoff_reset(self):
        schedule = calculate_schedule(leg1_miles=300, leg2_miles=200, current_cycle_used=0)
        timeline = build_timeline(schedule)
        self.assertTrue(any(item["type"] == "reset" for item in timeline))
