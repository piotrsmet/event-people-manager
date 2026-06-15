"use client";

import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StrategicPointResponse } from "../../types/strategicPoint";

// Helper to create beautiful icons for strategic points
const getStrategicIcon = (type: string) => {
  let color = "#3b82f6"; // blue (OTHER)
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

interface TerritoryMapProps {
  boundaryPoints: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
  strategicPoints: StrategicPointResponse[];
  onDeletePoint: (id: string) => void;
  isDrawingBoundary: boolean;
  isAddingPoint: boolean;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TerritoryMap({
  boundaryPoints,
  onMapClick,
  strategicPoints,
  onDeletePoint,
  isDrawingBoundary,
  isAddingPoint,
}: TerritoryMapProps) {
  // Center map on the first boundary point or a default location
  const center: [number, number] = boundaryPoints.length > 0 ? boundaryPoints[0] : [52.2297, 21.0122];

  return (
    <div className="w-full h-[550px] rounded-lg overflow-hidden border border-panel-border relative z-0">
      {/* Visual Indicator of Mode */}
      <div className="absolute top-4 right-4 z-[400] bg-panel-bg/95 border border-panel-border p-2.5 rounded shadow-lg text-xs font-semibold text-text-main flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${isDrawingBoundary ? 'bg-primary-blue animate-pulse' : isAddingPoint ? 'bg-amber-500 animate-pulse' : 'bg-text-muted'}`}></span>
        <span>
          {isDrawingBoundary
            ? "Tryb rysowania: klikaj na mapie, by stawiać granice"
            : isAddingPoint
            ? "Tryb dodawania: kliknij na mapie, by postawić punkt"
            : "Tryb podglądu: kliknij na punkt, by zobaczyć szczegóły"}
        </span>
      </div>

      <MapContainer
        center={center}
        zoom={boundaryPoints.length > 0 ? 15 : 13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Map Click Handler */}
        <MapClickHandler onClick={onMapClick} />

        {/* Boundary Polygon */}
        {boundaryPoints.length >= 3 && (
          <Polygon
            positions={boundaryPoints}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.2,
              weight: 3,
              dashArray: isDrawingBoundary ? "5, 5" : undefined,
            }}
          />
        )}

        {/* Boundary Vertex Markers (rendered only during drawing mode for easy adjustments) */}
        {isDrawingBoundary &&
          boundaryPoints.map((pt, idx) => (
            <Marker
              key={`vertex-${idx}`}
              position={pt}
              icon={L.divIcon({
                html: `<div class="w-3 h-3 rounded-full bg-primary-blue border-2 border-white"></div>`,
                className: "custom-vertex-icon",
                iconSize: [12, 12],
                iconAnchor: [6, 6],
              })}
            />
          ))}

        {/* Strategic Points */}
        {strategicPoints.map((pt) => {
          if (pt.latitude && pt.longitude) {
            return (
              <Marker
                key={pt.id}
                position={[pt.latitude, pt.longitude]}
                icon={getStrategicIcon(pt.type)}
              >
                <Popup className="custom-popup">
                  <div className="p-1 space-y-2 text-text-main">
                    <div className="font-bold text-sm">{pt.name}</div>
                    <div className="text-xs text-text-muted">Typ: <span className="font-semibold">{pt.type}</span></div>
                    <button
                      onClick={() => onDeletePoint(pt.id)}
                      className="w-full mt-1.5 py-1 px-2 bg-danger-red text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      Usuń punkt
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>
    </div>
  );
}
