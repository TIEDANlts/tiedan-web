"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import type { TripMapProps } from "@/modules/trips/map-types";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  if (points.length === 1) {
    map.setView(points[0], 12);
  } else if (points.length > 1) {
    map.fitBounds(points, { padding: [36, 36] });
  }

  return null;
}

export function TripMap({ tileConfig, day, selectedLocationId, onSelectLocation }: TripMapProps) {
  const locations = day?.locations ?? [];
  const points = locations.map((location) => [location.lat, location.lng] as [number, number]);
  const center: [number, number] = points[0] ?? [30.25, 120.15];

  return (
    <MapContainer center={center} zoom={points.length ? 12 : 3} className="h-full min-h-[24rem] w-full" scrollWheelZoom>
      {tileConfig.layers.map((layer) => (
        <TileLayer
          key={layer.url}
          url={layer.url}
          subdomains={layer.subdomains}
          attribution={tileConfig.attribution}
          maxZoom={18}
        />
      ))}
      <FitBounds points={points} />
      {points.length > 1 ? <Polyline positions={points} pathOptions={{ color: "#1F9E86", weight: 4 }} /> : null}
      {locations.map((location, index) => (
        <Marker
          key={location.id}
          position={[location.lat, location.lng]}
          icon={markerIcon}
          eventHandlers={{
            click: () => onSelectLocation(location.id),
          }}
        >
          <Popup>
            <span className={selectedLocationId === location.id ? "font-semibold text-module-trips" : ""}>
              {index + 1}. {location.name}
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
