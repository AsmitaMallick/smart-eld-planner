from django.test import SimpleTestCase

from trip.services.hos_engine import calculate_schedule


class HosEngineTests(SimpleTestCase):
    def test_30_min_break_triggered_after_8_hours_driving(self):
        schedule = calculate_schedule(leg1_miles=500, leg2_miles=0, current_cycle_used=0)

        break_events = [
            event
            for event in schedule
            if event["type"] == "break" and event["duration_hrs"] == 0.5
        ]
        self.assertTrue(break_events)

    def test_10_hour_rest_triggered_when_daily_driving_limit_reached(self):
        schedule = calculate_schedule(leg1_miles=700, leg2_miles=0, current_cycle_used=0)

        rest_events = [
            event
            for event in schedule
            if event["type"] == "rest" and event["duration_hrs"] == 10
        ]
        self.assertTrue(rest_events)
