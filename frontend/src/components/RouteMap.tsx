import { useEffect, useMemo } from "react";
import L, { type DivIcon, type LatLngTuple } from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import type { RoutePoint, TripStop } from "../types/trip";

const markerIcon = (color: string): DivIcon =>
  L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${color};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const markerByType: Record<string, DivIcon> = {
  pickup: markerIcon("#16a34a"),
  dropoff: markerIcon("#dc2626"),
  rest: markerIcon("#64748b"),
  fuel: markerIcon("#ea580c"),
};

interface AutoFitRouteProps {
  routePoints: RoutePoint[];
  stopPoints: TripStop[];
}

function AutoFitRoute({ routePoints, stopPoints }: AutoFitRouteProps) {
  const map = useMap();

  useEffect(() => {
    const points: LatLngTuple[] = [...routePoints, ...stopPoints.map((stop) => [Number(stop.lat), Number(stop.lng)] as LatLngTuple)].filter(
      (point): point is LatLngTuple =>
        Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
    );

    if (!points.length) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 11, { animate: true });
      return;
    }

    map.fitBounds(points, {
      padding: [28, 28],
      maxZoom: 12,
      animate: true,
    });
  }, [map, routePoints, stopPoints]);

  return null;
}

interface RouteMapProps {
  geometry: RoutePoint[];
  stops: TripStop[];
}

function RouteMap({ geometry, stops }: RouteMapProps) {
  const routePoints = useMemo<RoutePoint[]>(
    () =>
      (Array.isArray(geometry)
        ? geometry.filter(
            (point): point is RoutePoint =>
              Array.isArray(point) &&
              point.length === 2 &&
              Number.isFinite(point[0]) &&
              Number.isFinite(point[1])
          )
        : []),
    [geometry]
  );

  const stopPoints = useMemo<TripStop[]>(
    () =>
      (Array.isArray(stops)
        ? stops.filter(
            (stop): stop is TripStop =>
              stop != null && typeof stop.lat === "number" && Number.isFinite(stop.lat) && typeof stop.lng === "number" && Number.isFinite(stop.lng)
          )
        : []),
    [stops]
  );

  const center: LatLngTuple = routePoints[0] ?? [39.5, -98.35];

  return (
    <div className="card map-card">
      <div className="map-card-header">
        <h2>Route Preview</h2>
        <div className="map-legend" aria-label="Map legend">
          <span className="map-legend-item">
            <i className="map-legend-dot fuel" /> Fuel stops
          </span>
          <span className="map-legend-item">
            <i className="map-legend-dot rest" /> Rest stops
          </span>
          <span className="map-legend-item">
            <i className="map-legend-dot pickup" /> Pickup
          </span>
          <span className="map-legend-item">
            <i className="map-legend-dot dropoff" /> Dropoff
          </span>
        </div>
      </div>
      <MapContainer center={center} zoom={5} className="map-wrap" scrollWheelZoom>
        <AutoFitRoute routePoints={routePoints} stopPoints={stopPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePoints.length > 1 ? <Polyline positions={routePoints} color="#2563eb" weight={4} /> : null}
        {stopPoints.map((stop, idx) => (
          <Marker
            key={`${stop.type}-${idx}`}
            position={[stop.lat, stop.lng] as LatLngTuple}
            icon={markerByType[stop.type] || markerByType.rest}
          >
            <Popup>
              <strong>{stop.type}</strong>
              <br />
              {stop.notes || "-"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default RouteMap;
