from datetime import datetime

from django.test import SimpleTestCase

from trip.services.summary_service import calculate_summary


class SummaryServiceTests(SimpleTestCase):
    def test_empty_schedule_returns_zeroed_summary(self):
        summary = calculate_summary([], 0)

        self.assertEqual(summary["total_miles"], 0.0)
        self.assertEqual(summary["estimated_days"], 0)
        self.assertEqual(summary["total_drive_hours"], 0.0)
        self.assertEqual(summary["rest_stops"], 0)

    def test_rest_stops_counts_rest_daily_reset_and_cycle_reset(self):
        schedule = [
            {
                "status": "driving",
                "event_type": "drive",
                "duration_hours": 8.0,
                "start_time": datetime(2025, 1, 1, 6, 0),
            },
            {
                "status": "off_duty",
                "event_type": "rest",
                "duration_hours": 0.5,
                "start_time": datetime(2025, 1, 1, 14, 0),
            },
            {
                "status": "on_duty",
                "event_type": "fuel",
                "duration_hours": 0.5,
                "start_time": datetime(2025, 1, 1, 14, 30),
            },
            {
                "status": "sleeper",
                "event_type": "reset",
                "duration_hours": 10.0,
                "start_time": datetime(2025, 1, 1, 18, 0),
            },
            {
                "status": "driving",
                "event_type": "drive",
                "duration_hours": 6.0,
                "start_time": datetime(2025, 1, 2, 6, 0),
            },
            {
                "status": "on_duty",
                "event_type": "pickup",
                "duration_hours": 1.0,
                "start_time": datetime(2025, 1, 3, 8, 0),
            },
            {
                "status": "sleeper",
                "event_type": "cycle_reset",
                "duration_hours": 34.0,
                "start_time": datetime(2025, 1, 3, 18, 0),
            },
            {
                "status": "sleeper",
                "event_type": "end_of_trip_rest",
                "duration_hours": 10.0,
                "start_time": datetime(2025, 1, 3, 20, 0),
            },
            {
                "status": "on_duty",
                "event_type": "dropoff",
                "duration_hours": 1.0,
                "start_time": datetime(2025, 1, 4, 7, 0),
            },
        ]

        summary = calculate_summary(schedule, 1320.8)

        self.assertEqual(summary["total_miles"], 1320.8)
        self.assertEqual(summary["rest_stops"], 3)
        self.assertEqual(summary["estimated_days"], 4)
        self.assertEqual(summary["total_drive_hours"], 14.0)

    def test_end_of_trip_rest_is_not_counted_as_rest_stop(self):
        schedule = [
            {
                "status": "sleeper",
                "event_type": "end_of_trip_rest",
                "duration_hours": 10.0,
                "start_time": datetime(2025, 1, 1, 18, 0),
            }
        ]

        summary = calculate_summary(schedule, 0)

        self.assertEqual(summary["rest_stops"], 0)

    def test_drive_hours_fallback_uses_start_end(self):
        schedule = [
            {
                "status": "driving",
                "event_type": "drive",
                "start": 6.5,
                "end": 14.5,
                "start_time": datetime(2025, 1, 1, 6, 30),
            },
            {
                "status": "sleeper",
                "event_type": "reset",
                "start": 14.5,
                "end": 24.5,
                "start_time": datetime(2025, 1, 1, 14, 30),
            },
            {
                "status": "driving",
                "event_type": "drive",
                "start": 24.5,
                "end": 28.0,
                "start_time": datetime(2025, 1, 2, 0, 30),
            },
        ]

        summary = calculate_summary(schedule, 632.1)

        self.assertAlmostEqual(summary["total_drive_hours"], 11.5, places=6)
        self.assertEqual(summary["rest_stops"], 1)
        self.assertEqual(summary["estimated_days"], 2)
