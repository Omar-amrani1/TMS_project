import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

type LatLng = [number, number];

export type MapLocationLike = {
  id?: string;
  name?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const toCoord = (loc?: MapLocationLike | null): LatLng | null => {
  if (!loc) return null;
  const lat = Number(loc.latitude ?? loc.lat);
  const lng = Number(loc.longitude ?? loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

function FitToBounds({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24] });
    }
  }, [map, points]);

  return null;
}

export const RouteMap = ({
  from,
  to,
  height = 280,
}: {
  from?: MapLocationLike | null;
  to?: MapLocationLike | null;
  height?: number;
}) => {
  const fromCoord = toCoord(from);
  const toCoordValue = toCoord(to);

  const points = useMemo(() => {
    const p: LatLng[] = [];
    if (fromCoord) p.push(fromCoord);
    if (toCoordValue) p.push(toCoordValue);
    return p;
  }, [fromCoord, toCoordValue]);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Route map unavailable: missing coordinates.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <MapContainer
        center={points[0]}
        zoom={10}
        style={{ width: "100%", height }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToBounds points={points} />

        {fromCoord && (
          <Marker position={fromCoord} icon={markerIcon}>
            <Popup>
              <strong>From:</strong> {from?.name ?? "Origin"}
              <br />
              {from?.address ?? ""}
            </Popup>
          </Marker>
        )}

        {toCoordValue && (
          <Marker position={toCoordValue} icon={markerIcon}>
            <Popup>
              <strong>To:</strong> {to?.name ?? "Destination"}
              <br />
              {to?.address ?? ""}
            </Popup>
          </Marker>
        )}

        {fromCoord && toCoordValue && (
          <Polyline
            positions={[fromCoord, toCoordValue]}
            pathOptions={{ color: "#22d3ee", weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default RouteMap;
