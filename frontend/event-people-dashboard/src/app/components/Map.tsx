"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocationLog } from "../../types/location";
import { StrategicPointResponse } from "../../types/strategicPoint";

// Helper to create beautiful icons for strategic points on Leaflet map
const getStrategicIcon = (type: string) => {
  let color = "#3b82f6"; // blue
  let symbol = "📍";
  if (type === "MEDICAL") { color = "#ef4444"; symbol = "🏥"; }
  else if (type === "SECURITY") { color = "#f59e0b"; symbol = "🛡️"; }
  else if (type === "ENTRANCE") { color = "#10b981"; symbol = "🚪"; }
  else if (type === "STAGE") { color = "#8b5cf6"; symbol = "🎭"; }
  else if (type === "INFO") { color = "#06b6d4"; symbol = "ℹ️"; }

  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm shadow-lg transform transition-transform duration-200 hover:scale-110" style="background-color: ${color};">${symbol}</div>`,
    className: "custom-div-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Fix for default leaflet icons in Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  locations: LocationLog[];
  isConnected: boolean;
  boundaryGeoJson?: string;
  strategicPoints?: StrategicPointResponse[];
}

export default function Map({ locations, isConnected, boundaryGeoJson, strategicPoints = [] }: MapProps) {
  const [boundaryCoords, setBoundaryCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (boundaryGeoJson) {
      try {
        const geojson = JSON.parse(boundaryGeoJson);
        if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates?.[0])) {
          // GeoJSON coords are [lng, lat], Leaflet wants [lat, lng]
          const leafletCoords = geojson.coordinates[0].map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          // Remove last duplicate if closed
          if (
            leafletCoords.length > 1 &&
            leafletCoords[0][0] === leafletCoords[leafletCoords.length - 1][0] &&
            leafletCoords[0][1] === leafletCoords[leafletCoords.length - 1][1]
          ) {
            leafletCoords.pop();
          }
          setBoundaryCoords(leafletCoords);
        }
      } catch (err) {
        console.error("Błąd parsowania boundaryGeoJson w Map:", err);
      }
    } else {
      setBoundaryCoords([]);
    }
  }, [boundaryGeoJson]);

  // Center map on boundary or active locations or Warsaw as fallback
  const center: [number, number] =
    boundaryCoords.length > 0
      ? boundaryCoords[0]
      : locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [52.2297, 21.0122];

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-status-ok shadow-[0_0_8px_#10b981]' : 'bg-danger-red'}`}></div>
        <span className="text-sm font-medium text-text-muted">
          WebSockets: {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      
      <div className="w-full h-[600px] rounded-lg overflow-hidden border border-panel-border z-0">
        <MapContainer 
          center={center} 
          zoom={boundaryCoords.length > 0 ? 15 : 13} 
          scrollWheelZoom={true} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Render Boundary Polygon */}
          {boundaryCoords.length >= 3 && (
            <Polygon
              positions={boundaryCoords}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 3
              }}
            />
          )}

          {/* Render Strategic Points */}
          {strategicPoints.map((pt) => {
            if (pt.latitude && pt.longitude) {
              return (
                <Marker
                  key={pt.id}
                  position={[pt.latitude, pt.longitude]}
                  icon={getStrategicIcon(pt.type)}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 space-y-1 text-text-main text-xs">
                      <div className="font-bold text-sm">{pt.name}</div>
                      <div className="text-text-muted">Typ: <span className="font-semibold">{pt.type}</span></div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
          
          {/* Render Volunteer Locations */}
          {locations.map(loc => (
            <Marker 
              key={loc.userId} 
              position={[loc.latitude, loc.longitude]}
              icon={customIcon}
            >
              <Popup className="text-sm">
                <div className="font-bold">Użytkownik #{loc.userId}</div>
                <div>Status: {loc.status}</div>
                <div className="text-xs text-gray-500">{new Date(loc.timestamp).toLocaleTimeString()}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
