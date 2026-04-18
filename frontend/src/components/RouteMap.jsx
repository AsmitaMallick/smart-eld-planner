import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";

const markerIcon = (color) =>
  L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${color};"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const markerByType = {
  pickup: markerIcon("#16a34a"),
  dropoff: markerIcon("#dc2626"),
  rest: markerIcon("#64748b"),
  fuel: markerIcon("#ea580c"),
};

function RouteMap({ geometry, stops }) {
  const routePoints = useMemo(
    () => (Array.isArray(geometry) ? geometry.filter((point) => point?.length === 2) : []),
    [geometry]
  );

  const stopPoints = useMemo(
    () => (Array.isArray(stops) ? stops.filter((stop) => stop.lat != null && stop.lng != null) : []),
    [stops]
  );

  const center = routePoints[0] || [39.5, -98.35];

  return (
    <div className="card">
      <h2>Route Map</h2>
      <MapContainer center={center} zoom={5} className="map-wrap" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePoints.length > 1 ? <Polyline positions={routePoints} color="#2563eb" weight={4} /> : null}
        {stopPoints.map((stop, idx) => (
          <Marker
            key={`${stop.type}-${idx}`}
            position={[stop.lat, stop.lng]}
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
