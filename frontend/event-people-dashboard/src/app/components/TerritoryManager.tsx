"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { EventResponse } from "../../types/event";
import { StrategicPointResponse } from "../../types/strategicPoint";
import { getStrategicPoints, createStrategicPoint, deleteStrategicPoint } from "../actions/strategicPoint";
import { updateEvent } from "../actions/event";

// Dynamically import map component to disable SSR issues with Leaflet
const TerritoryMap = dynamic(() => import("./TerritoryMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[550px] flex items-center justify-center bg-dashboard-bg border border-panel-border rounded-lg">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm font-medium">Ładowanie mapy satelitarnej...</p>
      </div>
    </div>
  ),
});

interface TerritoryManagerProps {
  eventId: string;
  token: string;
  activeEvent: EventResponse | null;
  onUpdateEvent: (updatedEvent: EventResponse) => void;
}

export default function TerritoryManager({
  eventId,
  token,
  activeEvent,
  onUpdateEvent,
}: TerritoryManagerProps) {
  const [points, setPoints] = useState<StrategicPointResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outdoor modes
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([]);

  // Indoor click target ratios
  const [pendingCoordinates, setPendingCoordinates] = useState<{
    lat?: number;
    lng?: number;
    xRatio?: number;
    yRatio?: number;
  } | null>(null);

  // New point form modal
  const [showPointModal, setShowPointModal] = useState(false);
  const [newPointName, setNewPointName] = useState("");
  const [newPointType, setNewPointType] = useState<'MEDICAL' | 'SECURITY' | 'ENTRANCE' | 'STAGE' | 'INFO' | 'OTHER'>("OTHER");
  const [savingPoint, setSavingPoint] = useState(false);

  useEffect(() => {
    loadStrategicPoints();
    // Parse GeoJSON boundary if present
    if (activeEvent?.boundaryGeoJson) {
      try {
        const geojson = JSON.parse(activeEvent.boundaryGeoJson);
        if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates?.[0])) {
          // Convert GeoJSON coords [lng, lat] back to [lat, lng] for Leaflet
          const leafletCoords = geojson.coordinates[0].map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          // Remove last duplicate coord if it is a closed polygon
          if (
            leafletCoords.length > 1 &&
            leafletCoords[0][0] === leafletCoords[leafletCoords.length - 1][0] &&
            leafletCoords[0][1] === leafletCoords[leafletCoords.length - 1][1]
          ) {
            leafletCoords.pop();
          }
          setBoundaryPoints(leafletCoords);
        }
      } catch (err) {
        console.error("Błąd parsowania boundaryGeoJson:", err);
      }
    } else {
      setBoundaryPoints([]);
    }
  }, [eventId, activeEvent]);

  async function loadStrategicPoints() {
    setLoading(true);
    setError(null);
    const res = await getStrategicPoints(eventId);
    if (res.success && res.data) {
      setPoints(res.data);
    } else {
      setError(res.error || "Nie udało się wczytać punktów strategicznych");
    }
    setLoading(false);
  }

  // Handle map click for Outdoor
  const handleMapClick = (lat: number, lng: number) => {
    if (isDrawingBoundary) {
      setBoundaryPoints((prev) => [...prev, [lat, lng]]);
    } else if (isAddingPoint) {
      setPendingCoordinates({ lat, lng });
      setNewPointName("");
      setNewPointType("OTHER");
      setShowPointModal(true);
    }
  };

  // Handle canvas click for Indoor
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    setPendingCoordinates({ xRatio, yRatio });
    setNewPointName("");
    setNewPointType("OTHER");
    setShowPointModal(true);
  };

  // Save boundary points as GeoJSON
  async function handleSaveBoundary() {
    if (boundaryPoints.length < 3) {
      alert("Granica terenu musi składać się z co najmniej 3 punktów.");
      return;
    }
    setError(null);
    // Construct valid GeoJSON Polygon (repeating the first point at the end)
    const coordinates = [...boundaryPoints.map((p) => [p[1], p[0]])];
    coordinates.push([boundaryPoints[0][1], boundaryPoints[0][0]]); // Close the loop

    const boundaryGeoJson = JSON.stringify({
      type: "Polygon",
      coordinates: [coordinates],
    });

    const res = await updateEvent(eventId, { boundaryGeoJson });
    if (res.success && res.data) {
      onUpdateEvent(res.data);
      setIsDrawingBoundary(false);
      alert("Pomyślnie zapisano granice terenu.");
    } else {
      setError(res.error || "Błąd zapisu granic terenu");
    }
  }

  // Clear boundary points
  async function handleClearBoundary() {
    if (!confirm("Czy na pewno chcesz usunąć narysowaną granicę terenu?")) return;
    setError(null);
    const res = await updateEvent(eventId, { boundaryGeoJson: "" });
    if (res.success && res.data) {
      onUpdateEvent(res.data);
      setBoundaryPoints([]);
      setIsDrawingBoundary(false);
    } else {
      setError(res.error || "Błąd usuwania granic terenu");
    }
  }

  // Create strategic point
  async function handleCreatePoint(e: React.FormEvent) {
    e.preventDefault();
    if (!newPointName.trim() || !pendingCoordinates) return;

    setSavingPoint(true);
    setError(null);

    const res = await createStrategicPoint(eventId, {
      name: newPointName,
      type: newPointType,
      latitude: pendingCoordinates.lat,
      longitude: pendingCoordinates.lng,
      xRatio: pendingCoordinates.xRatio,
      yRatio: pendingCoordinates.yRatio,
    });

    if (res.success && res.data) {
      setPoints((prev) => [...prev, res.data!]);
      setShowPointModal(false);
      setPendingCoordinates(null);
      setIsAddingPoint(false);
    } else {
      setError(res.error || "Nie udało się utworzyć punktu");
    }
    setSavingPoint(false);
  }

  // Delete strategic point
  async function handleDeletePoint(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć ten punkt strategiczny?")) return;
    setError(null);
    const res = await deleteStrategicPoint(id);
    if (res.success) {
      setPoints((prev) => prev.filter((p) => p.id !== id));
    } else {
      setError(res.error || "Nie udało się usunąć punktu");
    }
  }

  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center space-y-2">
        <div className="w-6 h-6 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-xs">Wczytywanie konfiguracji terenu...</p>
      </div>
    );
  }

  const isOutdoor = activeEvent?.outdoor !== false;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Visual Canvas / Map (ColSpan 3) */}
      <div className="xl:col-span-3 space-y-4">
        {isOutdoor ? (
          <div className="space-y-4">
            {/* Outdoor Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setIsDrawingBoundary(!isDrawingBoundary);
                  setIsAddingPoint(false);
                }}
                className={`px-4 py-2 rounded text-xs font-semibold tracking-wide transition-all ${
                  isDrawingBoundary
                    ? "bg-primary-blue text-white shadow-lg shadow-blue-500/25"
                    : "bg-panel-border text-text-main hover:bg-panel-border/80"
                }`}
              >
                {isDrawingBoundary ? "🛑 Zakończ rysowanie" : "✏️ Rysuj granice"}
              </button>

              {isDrawingBoundary && (
                <button
                  onClick={handleSaveBoundary}
                  className="px-4 py-2 bg-status-ok text-white rounded text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                >
                  💾 Zapisz granice
                </button>
              )}

              {boundaryPoints.length > 0 && (
                <button
                  onClick={handleClearBoundary}
                  className="px-4 py-2 bg-danger-red text-white rounded text-xs font-semibold hover:bg-red-600 transition-colors"
                >
                  🗑️ Wyczyść granice
                </button>
              )}

              <div className="h-6 w-px bg-panel-border hidden sm:block"></div>

              <button
                onClick={() => {
                  setIsAddingPoint(!isAddingPoint);
                  setIsDrawingBoundary(false);
                }}
                className={`px-4 py-2 rounded text-xs font-semibold tracking-wide transition-all ${
                  isAddingPoint
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/25"
                    : "bg-panel-border text-text-main hover:bg-panel-border/80"
                }`}
              >
                {isAddingPoint ? "🛑 Anuluj dodawanie" : "➕ Dodaj punkt strategiczny"}
              </button>
            </div>

            {/* Leaflet Map Component */}
            <TerritoryMap
              boundaryPoints={boundaryPoints}
              onMapClick={handleMapClick}
              strategicPoints={points}
              onDeletePoint={handleDeletePoint}
              isDrawingBoundary={isDrawingBoundary}
              isAddingPoint={isAddingPoint}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Indoor Header */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded text-xs text-text-muted">
              💡 Kliknij w dowolne miejsce na planie budynku poniżej, aby umieścić punkt strategiczny (np. wejście, stoisko).
            </div>

            {/* Plan Canvas */}
            <div className="w-full border border-panel-border rounded-lg overflow-hidden relative bg-black/40 flex justify-center items-center p-4 min-h-[500px]">
              {activeEvent?.buildingPlanBase64 ? (
                <div
                  className="relative cursor-crosshair max-w-full max-h-[700px] overflow-hidden"
                  onClick={handleCanvasClick}
                >
                  <img
                    src={activeEvent.buildingPlanBase64}
                    alt="Rzut budynku"
                    className="max-w-full max-h-[600px] object-contain select-none pointer-events-none"
                  />

                  {/* Absolute points overlay */}
                  {points.map((pt) => {
                    if (pt.xRatio !== undefined && pt.yRatio !== undefined) {
                      let color = "#3b82f6";
                      let symbol = "📍";
                      if (pt.type === "MEDICAL") { color = "#ef4444"; symbol = "🏥"; }
                      else if (pt.type === "SECURITY") { color = "#f59e0b"; symbol = "🛡️"; }
                      else if (pt.type === "ENTRANCE") { color = "#10b981"; symbol = "🚪"; }
                      else if (pt.type === "STAGE") { color = "#8b5cf6"; symbol = "🎭"; }
                      else if (pt.type === "INFO") { color = "#06b6d4"; symbol = "ℹ️"; }

                      return (
                        <div
                          key={pt.id}
                          className="absolute w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm shadow-xl cursor-pointer group"
                          style={{
                            left: `${pt.xRatio * 100}%`,
                            top: `${pt.yRatio * 100}%`,
                            transform: "translate(-50%, -50%)",
                            backgroundColor: color,
                          }}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering new point click
                          }}
                        >
                          {symbol}
                          {/* Premium Hover tooltip */}
                          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-panel-bg/95 border border-panel-border px-3 py-2 rounded shadow-2xl text-xs text-text-main pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-44 z-50 text-center">
                            <p className="font-bold text-sm truncate">{pt.name}</p>
                            <p className="text-text-muted mt-0.5 uppercase tracking-wider text-[9px]">{pt.type}</p>
                            <p className="text-[10px] text-danger-red mt-1 font-semibold">Kliknij usuń na liście obok</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div className="text-center text-text-muted text-sm py-12">
                  Brak wgranego planu budynku. Zaktualizuj wydarzenie w ustawieniach.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Points Sidebar (ColSpan 1) */}
      <div className="dashboard-panel p-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-panel-border">
          <h3 className="font-medium text-text-main">Punkty Strategiczne</h3>
          <span className="bg-panel-border text-text-muted text-xs px-2 py-0.5 rounded font-semibold">
            {points.length}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-danger-red/10 border border-danger-red/50 text-danger-red rounded text-xs text-center">
            {error}
          </div>
        )}

        {points.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">
            Brak dodanych punktów.
            {isOutdoor ? " Włącz tryb dodawania i kliknij na mapie." : " Kliknij na obraz planu budynku."}
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
            {points.map((pt) => {
              let badgeColor = "bg-blue-500/20 text-blue-400 border-blue-500/30";
              if (pt.type === "MEDICAL") badgeColor = "bg-red-500/20 text-red-400 border-red-500/30";
              else if (pt.type === "SECURITY") badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
              else if (pt.type === "ENTRANCE") badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              else if (pt.type === "STAGE") badgeColor = "bg-purple-500/20 text-purple-400 border-purple-500/30";
              else if (pt.type === "INFO") badgeColor = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";

              return (
                <div
                  key={pt.id}
                  className="p-3 border border-panel-border/50 bg-panel-bg/30 rounded flex justify-between items-center group hover:bg-panel-bg/60 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-text-main text-xs truncate" title={pt.name}>
                      {pt.name}
                    </p>
                    <span className={`inline-block border rounded px-1.5 py-0.5 text-[9px] font-bold mt-1 uppercase ${badgeColor}`}>
                      {pt.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePoint(pt.id)}
                    className="text-text-muted hover:text-danger-red transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Premium Point Details Modal Form */}
      {showPointModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
          <div className="dashboard-panel max-w-md w-full p-6 space-y-5 bg-panel-bg border border-panel-border rounded-lg shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-panel-border">
              <h3 className="text-base font-semibold text-text-main">
                Nowy Punkt Strategiczny
              </h3>
              <button
                onClick={() => {
                  setShowPointModal(false);
                  setPendingCoordinates(null);
                }}
                className="text-text-muted hover:text-text-main text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePoint} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">
                  Nazwa punktu
                </label>
                <input
                  type="text"
                  required
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                  placeholder="np. Namiot Medyczny A"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">
                  Typ punktu
                </label>
                <select
                  value={newPointType}
                  onChange={(e) => setNewPointType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                >
                  <option value="MEDICAL">🏥 Medyczny / Pomoc</option>
                  <option value="SECURITY">🛡️ Ochrona / Bezpieczeństwo</option>
                  <option value="ENTRANCE">🚪 Wejście / Brama</option>
                  <option value="STAGE">🎭 Scena / Atrakcja</option>
                  <option value="INFO">ℹ️ Informacyjny</option>
                  <option value="OTHER">📍 Inny punkt</option>
                </select>
              </div>

              {pendingCoordinates?.lat && (
                <div className="p-2 border border-panel-border/30 rounded bg-black/10 text-[10px] text-text-muted font-mono">
                  Koordynaty: {pendingCoordinates.lat.toFixed(5)}, {pendingCoordinates.lng?.toFixed(5)}
                </div>
              )}

              {pendingCoordinates?.xRatio !== undefined && pendingCoordinates?.yRatio !== undefined && (
                <div className="p-2 border border-panel-border/30 rounded bg-black/10 text-[10px] text-text-muted font-mono">
                  Współrzędne względne planu: X: {(pendingCoordinates.xRatio * 100).toFixed(1)}%, Y: {(pendingCoordinates.yRatio * 100).toFixed(1)}%
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowPointModal(false);
                    setPendingCoordinates(null);
                  }}
                  className="px-4 py-2 border border-panel-border text-text-muted rounded hover:text-text-main text-xs font-semibold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingPoint}
                  className="btn-primary py-2 px-4 text-xs font-semibold"
                >
                  {savingPoint ? "Zapisywanie..." : "Dodaj Punkt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
