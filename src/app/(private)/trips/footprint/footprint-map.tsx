"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { FootprintMapProps } from "@/modules/trips/map-types";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitAll({ points }: { points: FootprintMapProps["points"] }) {
  const map = useMap();

  if (points.length > 1) {
    map.fitBounds(points.map((point) => [point.lat, point.lng] as [number, number]), { padding: [48, 48] });
  } else if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 7);
  }

  return null;
}

export function FootprintMap({ tileConfig, points }: FootprintMapProps) {
  return (
    <MapContainer center={[30, 110]} zoom={3} className="h-[70vh] min-h-[28rem] w-full" scrollWheelZoom>
      {tileConfig.layers.map((layer) => (
        <TileLayer
          key={layer.url}
          url={layer.url}
          subdomains={layer.subdomains}
          attribution={tileConfig.attribution}
          maxZoom={18}
        />
      ))}
      <FitAll points={points} />
      {points.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]} icon={markerIcon}>
          <Popup>
            <span className="font-semibold">{point.name}</span>
            <br />
            {point.trips} 次旅行
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
