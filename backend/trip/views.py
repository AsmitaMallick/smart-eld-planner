import os

import requests
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.trip.services.eld_builder import build_eld_logs
from backend.trip.services.hos_engine import build_timeline, calculate_schedule
from backend.trip.services.route_service import plan_route
from backend.trip.services.summary_service import calculate_summary


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
        dropoff_seen = False

        for event in schedule:
            event_type = event.get("event_type")
            duration = float(event.get("duration_hours", 0) or 0)

            if event_type == "drive":
                miles_progress += float(event.get("miles", 0) or 0)
                continue

            if event_type == "pickup":
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

            if event_type == "dropoff":
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
                dropoff_seen = True
                continue

            if event_type == "fuel":
                point = self._point_on_route(geometry, miles_progress / total_miles if total_miles else 0)
                stops.append(
                    {
                        "type": "fuel",
                        "duration_hrs": duration,
                        "notes": "Fuel stop",
                        "lat": point["lat"] if point else None,
                        "lng": point["lng"] if point else None,
                    }
                )
                continue

            if event_type in {"rest", "reset"}:
                if dropoff_seen:
                    continue
                point = self._point_on_route(geometry, miles_progress / total_miles if total_miles else 0)
                stops.append(
                    {
                        "type": "rest",
                        "duration_hrs": duration,
                        "notes": "Rest stop",
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
            timeline = build_timeline(schedule)
            stops = self._build_stops(schedule, route, pickup, dropoff)
            summary = calculate_summary(schedule, route.get("total_miles", 0))

            return Response(
                {
                    "route": route,
                    "schedule": schedule,
                    "summary": summary,
                    "stops": stops,
                    "timeline": timeline,
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


class LocationSearchView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        query = str(request.query_params.get("q") or "").strip()
        if len(query) < 3:
            return Response([])

        api_key = os.getenv("ORS_API_KEY")
        if not api_key:
            return Response(
                {"detail": "Missing ORS_API_KEY"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            response = requests.get(
                "https://api.openrouteservice.org/geocode/search",
                params={"api_key": api_key, "text": query, "size": 5},
                headers={"User-Agent": "smart-eld-planner/1.0"},
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException:
            return Response(
                {"detail": "Unable to load location suggestions"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data = response.json()
        except ValueError:
            return Response(
                {"detail": "Invalid geocoding response"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        features = data.get("features", []) if isinstance(data, dict) else []
        results = []
        for feature in features:
            if not isinstance(feature, dict):
                continue

            geometry = feature.get("geometry") or {}
            coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
            properties = feature.get("properties") or {}

            if (
                not isinstance(coordinates, list)
                or len(coordinates) < 2
                or not isinstance(properties, dict)
            ):
                continue

            lng, lat = coordinates[0], coordinates[1]
            label = str(properties.get("label") or properties.get("name") or "").strip()

            if not label:
                continue

            try:
                lat_num = float(lat)
                lng_num = float(lng)
            except (TypeError, ValueError):
                continue

            results.append({"label": label, "lat": lat_num, "lng": lng_num})

            if len(results) == 5:
                break

        return Response(results)
