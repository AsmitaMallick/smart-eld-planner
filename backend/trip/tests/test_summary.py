from django.test import SimpleTestCase

from backend.trip.services.summary_service import calculate_summary


class SummaryServiceTests(SimpleTestCase):
    def test_empty_schedule_returns_zeroed_summary(self):
        summary = calculate_summary([], 0)

        self.assertEqual(summary["total_miles"], 0.0)
        self.assertEqual(summary["estimated_days"], 0)
        self.assertEqual(summary["total_drive_hours"], 0.0)
        self.assertEqual(summary["rest_stops"], 0)

    def test_rest_stops_counts_rest_and_resets(self):
        schedule = [
            {"status": "driving", "event_type": "drive", "duration_hours": 8.0},
            {"status": "off_duty", "event_type": "rest", "duration_hours": 0.5},
            {"status": "on_duty", "event_type": "fuel", "duration_hours": 0.5},
            {"status": "sleeper", "event_type": "reset", "duration_hours": 10.0},
            {"status": "driving", "event_type": "drive", "duration_hours": 6.0},
            {"status": "on_duty", "event_type": "pickup", "duration_hours": 1.0},
            {"status": "sleeper", "event_type": "reset", "duration_hours": 10.0},
            {"status": "on_duty", "event_type": "dropoff", "duration_hours": 1.0},
        ]

        summary = calculate_summary(schedule, 1320.8)

        self.assertEqual(summary["total_miles"], 1320.8)
        self.assertEqual(summary["rest_stops"], 3)
        self.assertEqual(summary["estimated_days"], 4)
        self.assertEqual(summary["total_drive_hours"], 14.0)

    def test_drive_hours_fallback_uses_start_end(self):
        schedule = [
            {"status": "driving", "event_type": "drive", "start": 6.5, "end": 14.5},
            {"status": "sleeper", "event_type": "reset", "start": 14.5, "end": 24.5},
            {"status": "driving", "event_type": "drive", "start": 24.5, "end": 28.0},
        ]

        summary = calculate_summary(schedule, 632.1)

        self.assertAlmostEqual(summary["total_drive_hours"], 11.5, places=6)
        self.assertEqual(summary["rest_stops"], 1)
        self.assertEqual(summary["estimated_days"], 2)
