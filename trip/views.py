from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from trip.services.eld_builder import build_eld_logs
from trip.services.hos_engine import calculate_schedule
from trip.services.route_service import plan_route


class TripPlanView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def _point_on_route(self, geometry, fraction):
        if not geometry:
            return None

        clamped = max(0.0, min(1.0, fraction))
        index = int(round(clamped * (len(geometry) - 1)))
        point = geometry[index]
        return {"lat": point[0], "lng": point[1]}

    def _build_stops(self, schedule, route, pickup, dropoff):
        stops = []
        points = route.get("points", {})
        geometry = route.get("geometry", [])
        total_miles = float(route.get("total_miles", 0) or 0)

        miles_progress = 0.0

        for event in schedule:
            event_type = event.get("type")
            notes = (event.get("notes") or "").strip()
            duration = float(event.get("duration_hrs", 0) or 0)

            if event_type == "driving":
                miles_progress += float(event.get("miles", 0) or 0)
                continue

            if event_type == "on_duty_nd" and notes.lower().startswith("pickup"):
                pickup_point = points.get("pickup") or {}
                stops.append(
                    {
                        "type": "pickup",
                        "duration_hrs": duration,
                        "notes": f"Pickup - {pickup}",
                        "lat": pickup_point.get("lat"),
                        "lng": pickup_point.get("lng"),
                    }
                )
                continue

            if event_type == "on_duty_nd" and notes.lower().startswith("dropoff"):
                dropoff_point = points.get("dropoff") or {}
                stops.append(
                    {
                        "type": "dropoff",
                        "duration_hrs": duration,
                        "notes": f"Dropoff - {dropoff}",
                        "lat": dropoff_point.get("lat"),
                        "lng": dropoff_point.get("lng"),
                    }
                )
                continue

            if "fuel" in notes.lower():
                point = self._point_on_route(geometry, miles_progress / total_miles if total_miles else 0)
                stops.append(
                    {
                        "type": "fuel",
                        "duration_hrs": duration,
                        "notes": notes or "Fuel stop",
                        "lat": point["lat"] if point else None,
                        "lng": point["lng"] if point else None,
                    }
                )
                continue

            if event_type in {"rest", "off_duty", "break"}:
                point = self._point_on_route(geometry, miles_progress / total_miles if total_miles else 0)
                stops.append(
                    {
                        "type": "rest",
                        "duration_hrs": duration,
                        "notes": notes or "Rest stop",
                        "lat": point["lat"] if point else None,
                        "lng": point["lng"] if point else None,
                    }
                )

        return stops

    def post(self, request):
        origin = request.data.get("origin")
        pickup = request.data.get("pickup")
        dropoff = request.data.get("dropoff")
        current_cycle_used = request.data.get("current_cycle_used", 0)

        if not origin or not pickup or not dropoff:
            return Response(
                {"detail": "origin, pickup, and dropoff are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            route = plan_route(origin, pickup, dropoff)
            schedule = calculate_schedule(
                route["leg1_miles"],
                route["leg2_miles"],
                current_cycle_used,
            )
            logs = build_eld_logs(schedule)
            stops = self._build_stops(schedule, route, pickup, dropoff)

            return Response(
                {
                    "route": route,
                    "schedule": schedule,
                    "stops": stops,
                    "eld_logs": logs,
                }
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(
                {"detail": "Failed to plan trip"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
