"use client";

import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StrategicPointResponse } from "../../types/strategicPoint";
import { ZoneResponse } from "../../types/zone";

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

// Helper for zone vertex icons (small dot of the zone's color)
const getVertexIcon = (color: string) => {
  return L.divIcon({
    html: `<div class="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md cursor-pointer" style="background-color: ${color};"></div>`,
    className: "custom-vertex-icon",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

interface TerritoryMapProps {
  boundaryPoints: [number, number][];
  onUpdateBoundaryPoint?: (index: number, lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  strategicPoints: StrategicPointResponse[];
  onDeletePoint: (id: string) => void;
  isDrawingBoundary: boolean;
  isAddingPoint: boolean;
  
  // Zone related props
  zones: ZoneResponse[];
  activeZoneId?: string | null;
  isDrawingZone: boolean;
  zoneDrawingPoints: [number, number][];
  onUpdateZoneDrawingPoint?: (index: number, lat: number, lng: number) => void;
  editingZonePoints: [number, number][];
  onUpdateEditingZonePoint?: (index: number, lat: number, lng: number) => void;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const parseGeoJsonToPoints = (geoJsonStr: string | null | undefined): [number, number][] => {
  if (!geoJsonStr) return [];
  try {
    const geojson = JSON.parse(geoJsonStr);
    if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates?.[0])) {
      const leafletCoords = geojson.coordinates[0].map((c: [number, number]) => [c[1], c[0]] as [number, number]);
      if (
        leafletCoords.length > 1 &&
        leafletCoords[0][0] === leafletCoords[leafletCoords.length - 1][0] &&
        leafletCoords[0][1] === leafletCoords[leafletCoords.length - 1][1]
      ) {
        leafletCoords.pop();
      }
      return leafletCoords;
    }
  } catch (e) {
    console.error("Błąd parsowania granic strefy:", e);
  }
  return [];
};

export default function TerritoryMap({
  boundaryPoints,
  onUpdateBoundaryPoint,
  onMapClick,
  strategicPoints,
  onDeletePoint,
  isDrawingBoundary,
  isAddingPoint,
  zones,
  activeZoneId,
  isDrawingZone,
  zoneDrawingPoints,
  onUpdateZoneDrawingPoint,
  editingZonePoints,
  onUpdateEditingZonePoint,
}: TerritoryMapProps) {
  // Center map on the first boundary point or a default location
  const center: [number, number] = boundaryPoints.length > 0 ? boundaryPoints[0] : [52.2297, 21.0122];

  return (
    <div className="w-full h-[550px] rounded-lg overflow-hidden border border-panel-border relative z-0">
      {/* Visual Indicator of Mode */}
      <div className="absolute top-4 right-4 z-[400] bg-panel-bg/95 border border-panel-border p-2.5 rounded shadow-lg text-xs font-semibold text-text-main flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${
          isDrawingBoundary ? 'bg-primary-blue animate-pulse' : 
          isDrawingZone ? 'bg-purple-500 animate-pulse' :
          activeZoneId ? 'bg-pink-500 animate-pulse' :
          isAddingPoint ? 'bg-amber-500 animate-pulse' : 
          'bg-text-muted'
        }`}></span>
        <span>
          {isDrawingBoundary
            ? "Tryb rysowania: klikaj na mapie, by stawiać granice wydarzenia (możesz przeciągać punkty)"
            : isDrawingZone
            ? "Tryb rysowania strefy: klikaj na mapie, by stawiać rogi strefy (możesz je przeciągać)"
            : activeZoneId
            ? "Tryb edycji strefy: przeciągaj wierzchołki strefy na mapie, by zmienić jej obszar"
            : isAddingPoint
            ? "Tryb dodawania: kliknij na mapie, by postawić punkt strategiczny"
            : "Tryb podglądu: kliknij na punkt lub strefę, by zobaczyć szczegóły"}
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

        {/* Event Boundary Polygon */}
        {boundaryPoints.length >= 3 && (
          <Polygon
            positions={boundaryPoints}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.1,
              weight: 3,
              dashArray: isDrawingBoundary ? "5, 5" : undefined,
            }}
          />
        )}

        {/* Event Boundary Vertex Markers (rendered only during drawing mode for easy adjustments, now draggable!) */}
        {isDrawingBoundary &&
          boundaryPoints.map((pt, idx) => (
            <Marker
              key={`vertex-${idx}`}
              position={pt}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const target = e.target;
                  if (target) {
                    const latLng = target.getLatLng();
                    onUpdateBoundaryPoint?.(idx, latLng.lat, latLng.lng);
                  }
                }
              }}
              icon={getVertexIcon("#3b82f6")}
            />
          ))}

        {/* Render Saved Zones (except the one being actively edited as we draw it separately) */}
        {zones.map((z) => {
          if (z.id === activeZoneId) return null; // Rendered separately below
          const pts = parseGeoJsonToPoints(z.boundaryGeoJson);
          if (pts.length < 3) return null;

          // In adding-point mode, make zones interactive (click-through) rather than showing popup
          const isInteractiveMode = isAddingPoint || isDrawingBoundary || isDrawingZone;

          return (
            <Polygon
              key={z.id}
              positions={pts}
              pathOptions={{
                color: z.color || "#3b82f6",
                fillColor: z.color || "#3b82f6",
                fillOpacity: 0.25,
                weight: 2,
              }}
              interactive={!isInteractiveMode}
              bubblingMouseEvents={isInteractiveMode}
            >
              {!isInteractiveMode && (
              <Popup className="custom-popup">
                <div className="p-2 space-y-2.5 text-text-main text-xs min-w-[180px]">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-panel-border/30">
                    <div className="font-bold text-sm flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full border border-white/20 shadow-sm animate-pulse" style={{ backgroundColor: z.color || '#3b82f6' }}></span>
                      <span className="truncate max-w-[140px] text-text-main">{z.name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {z.description && (
                    <p className="text-[10px] text-text-muted leading-relaxed italic bg-black/15 p-1.5 rounded border border-panel-border/10">
                      {z.description}
                    </p>
                  )}

                  {/* Capacity */}
                  <div className="flex justify-between items-center bg-panel-bg/30 px-2 py-1 rounded border border-panel-border/20 text-[10px]">
                    <span className="text-text-muted">Pojemność:</span>
                    <strong className="text-text-main font-semibold">
                      {z.capacity ? `${z.capacity} osób` : "Nielimitowana"}
                    </strong>
                  </div>

                  {/* Access Status / ACL */}
                  {(z.allowedRoles || z.accessTags) ? (
                    <div className="space-y-1.5 bg-black/25 p-2 rounded border border-panel-border/25">
                      <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        <span>🔒 Dostęp Ograniczony (ACL)</span>
                      </div>
                      
                      {z.allowedRoles && (
                        <div className="space-y-1">
                          <div className="text-[8px] text-text-muted font-semibold uppercase">Role pracowników:</div>
                          <div className="flex flex-wrap gap-1">
                            {z.allowedRoles.split(',').filter(Boolean).map(r => (
                              <span key={r} className="bg-blue-500/20 text-blue-300 border border-blue-500/35 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {z.accessTags && (
                        <div className="space-y-1 mt-1.5">
                          <div className="text-[8px] text-text-muted font-semibold uppercase">Przepustki gości:</div>
                          <div className="flex flex-wrap gap-1">
                            {z.accessTags.split(',').filter(Boolean).map(t => (
                              <span key={t} className="bg-amber-500/20 text-amber-300 border border-amber-500/35 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-1 py-1.5 bg-status-ok/10 text-status-ok border border-status-ok/20 rounded font-semibold text-[10px]">
                      <span>🔓 Strefa otwarta dla wszystkich</span>
                    </div>
                  )}
                </div>
              </Popup>
              )}
            </Polygon>
          );
        })}

        {/* Render active zone drawing polygon */}
        {isDrawingZone && zoneDrawingPoints.length > 0 && (
          <>
            {zoneDrawingPoints.length >= 3 && (
              <Polygon
                positions={zoneDrawingPoints}
                pathOptions={{
                  color: "#a855f7", // purple
                  fillColor: "#a855f7",
                  fillOpacity: 0.2,
                  weight: 2.5,
                  dashArray: "5, 5",
                }}
              />
            )}
            {zoneDrawingPoints.map((pt, idx) => (
              <Marker
                key={`zone-draw-vertex-${idx}`}
                position={pt}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const target = e.target;
                    if (target) {
                      const latLng = target.getLatLng();
                      onUpdateZoneDrawingPoint?.(idx, latLng.lat, latLng.lng);
                    }
                  }
                }}
                icon={getVertexIcon("#a855f7")}
              />
            ))}
          </>
        )}

        {/* Render active zone being edited polygon */}
        {activeZoneId && editingZonePoints.length > 0 && (
          <>
            {editingZonePoints.length >= 3 && (
              <Polygon
                positions={editingZonePoints}
                pathOptions={{
                  color: zones.find(z => z.id === activeZoneId)?.color || "#ec4899", // pink
                  fillColor: zones.find(z => z.id === activeZoneId)?.color || "#ec4899",
                  fillOpacity: 0.3,
                  weight: 3,
                }}
              />
            )}
            {editingZonePoints.map((pt, idx) => (
              <Marker
                key={`zone-edit-vertex-${idx}`}
                position={pt}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const target = e.target;
                    if (target) {
                      const latLng = target.getLatLng();
                      onUpdateEditingZonePoint?.(idx, latLng.lat, latLng.lng);
                    }
                  }
                }}
                icon={getVertexIcon(zones.find(z => z.id === activeZoneId)?.color || "#ec4899")}
              />
            ))}
          </>
        )}

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
