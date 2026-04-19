import os
from typing import Optional, Tuple

import requests


def geocode(address: str) -> Tuple[Optional[float], Optional[float]]:
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": address, "format": "json", "limit": 1},
        headers={"User-Agent": "smart-eld-planner/1.0"},
        timeout=10,
    )
    response.raise_for_status()

    results = response.json()
    if not results:
        return None, None

    first = results[0]
    return float(first["lat"]), float(first["lon"])


def get_route(start: Tuple[float, float], end: Tuple[float, float]) -> Tuple[float, float]:
    route_data = get_route_data(start, end)
    return route_data["distance_miles"], route_data["duration_hours"]


def get_route_data(start: Tuple[float, float], end: Tuple[float, float]) -> dict:
    api_key = os.getenv("ORS_API_KEY")
    if not api_key:
        raise ValueError("Missing ORS_API_KEY")

    response = requests.post(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        json={"coordinates": [list(start), list(end)]},
        headers={
            "Authorization": api_key,
            "User-Agent": "smart-eld-planner/1.0",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    response.raise_for_status()

    data = response.json()
    features = data.get("features", [])
    if not features:
        raise ValueError("No route returned by OpenRouteService")

    summary = features[0]["properties"]["summary"]
    distance_miles = float(summary["distance"]) / 1609.344
    duration_hours = float(summary["duration"]) / 3600
    geometry = features[0].get("geometry", {}).get("coordinates", [])
    lat_lng_points = [
        [float(point[1]), float(point[0])]
        for point in geometry
        if isinstance(point, list) and len(point) >= 2
    ]
    return {
        "distance_miles": distance_miles,
        "duration_hours": duration_hours,
        "geometry": lat_lng_points,
    }


def plan_route(origin: str, pickup: str, dropoff: str) -> dict:
    origin_lat, origin_lng = geocode(origin)
    pickup_lat, pickup_lng = geocode(pickup)
    dropoff_lat, dropoff_lng = geocode(dropoff)

    if origin_lat is None or origin_lng is None:
        raise ValueError("Could not geocode origin")
    if pickup_lat is None or pickup_lng is None:
        raise ValueError("Could not geocode pickup")
    if dropoff_lat is None or dropoff_lng is None:
        raise ValueError("Could not geocode dropoff")

    leg1 = get_route_data((origin_lng, origin_lat), (pickup_lng, pickup_lat))
    leg2 = get_route_data((pickup_lng, pickup_lat), (dropoff_lng, dropoff_lat))
    total_miles = leg1["distance_miles"] + leg2["distance_miles"]
    geometry = leg1["geometry"] + leg2["geometry"][1:]

    return {
        "leg1_miles": leg1["distance_miles"],
        "leg2_miles": leg2["distance_miles"],
        "total_miles": total_miles,
        "geometry": geometry,
        "points": {
            "origin": {"lat": origin_lat, "lng": origin_lng, "label": origin},
            "pickup": {"lat": pickup_lat, "lng": pickup_lng, "label": pickup},
            "dropoff": {"lat": dropoff_lat, "lng": dropoff_lng, "label": dropoff},
        },
    }
