"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { EventResponse } from "../../types/event";
import { StrategicPointResponse } from "../../types/strategicPoint";
import { ZoneResponse } from "../../types/zone";
import { getStrategicPoints, createStrategicPoint, deleteStrategicPoint } from "../actions/strategicPoint";
import { updateEvent } from "../actions/event";
import { createZone, updateZone, deleteZone } from "../actions/zone";

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
  zones: ZoneResponse[];
  onRefreshZones: () => void;
}

const PREMIUM_COLORS = [
  { hex: "#3b82f6", name: "Niebieski" },
  { hex: "#10b981", name: "Zielony" },
  { hex: "#ef4444", name: "Czerwony" },
  { hex: "#f59e0b", name: "Bursztynowy" },
  { hex: "#8b5cf6", name: "Fioletowy" },
  { hex: "#ec4899", name: "Różowy" },
  { hex: "#06b6d4", name: "Błękitny" },
  { hex: "#f97316", name: "Pomarańczowy" },
  { hex: "#14b8a6", name: "Morski" }
];

const SYSTEM_ROLES = ["COORDINATOR", "SECURITY", "VOLUNTEER"];
const ACCESS_TAGS = ["STAFF", "MEDIA", "VIP", "TECHNICIAN", "ARTIST", "BACKSTAGE", "CREW"];

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

export default function TerritoryManager({
  eventId,
  token,
  activeEvent,
  onUpdateEvent,
  zones,
  onRefreshZones,
}: TerritoryManagerProps) {
  const [points, setPoints] = useState<StrategicPointResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outdoor modes
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([]);

  // Zone drawing and editing states
  const [isDrawingZone, setIsDrawingZone] = useState(false);
  const [zoneDrawingPoints, setZoneDrawingPoints] = useState<[number, number][]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [editingZonePoints, setEditingZonePoints] = useState<[number, number][]>([]);

  // Zone form/modal states
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneFormName, setZoneFormName] = useState("");
  const [zoneFormDesc, setZoneFormDesc] = useState("");
  const [zoneFormCapacity, setZoneFormCapacity] = useState("");
  const [zoneFormColor, setZoneFormColor] = useState("#3b82f6");
  const [zoneFormRoles, setZoneFormRoles] = useState<string[]>([]);
  const [zoneFormTags, setZoneFormTags] = useState<string[]>([]);
  const [savingZone, setSavingZone] = useState(false);

  // Indoor click target ratios
  const [pendingCoordinates, setPendingCoordinates] = useState<{
    lat?: number;
    lng?: number;
    xRatio?: number;
    yRatio?: number;
  } | null>(null);

  // New strategic point form modal
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
          const leafletCoords = geojson.coordinates[0].map((c: [number, number]) => [c[1], c[0]] as [number, number]);
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
    } else if (isDrawingZone) {
      setZoneDrawingPoints((prev) => [...prev, [lat, lng]]);
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

  // Draggable vertex updates
  const handleUpdateBoundaryPoint = (idx: number, lat: number, lng: number) => {
    setBoundaryPoints((prev) => {
      const copy = [...prev];
      copy[idx] = [lat, lng];
      return copy;
    });
  };

  const handleUpdateZoneDrawingPoint = (idx: number, lat: number, lng: number) => {
    setZoneDrawingPoints((prev) => {
      const copy = [...prev];
      copy[idx] = [lat, lng];
      return copy;
    });
  };

  const handleUpdateEditingZonePoint = (idx: number, lat: number, lng: number) => {
    setEditingZonePoints((prev) => {
      const copy = [...prev];
      copy[idx] = [lat, lng];
      return copy;
    });
  };

  // Zone actions: Start drawing new zone
  const handleStartDrawZone = () => {
    setIsDrawingZone(true);
    setZoneDrawingPoints([]);
    setIsDrawingBoundary(false);
    setIsAddingPoint(false);
    setActiveZoneId(null);
  };

  // Open modal to configure new zone after drawing
  const handleOpenZoneModalForNew = () => {
    if (zoneDrawingPoints.length < 3) {
      alert("Strefa musi składać się z co najmniej 3 punktów.");
      return;
    }
    setZoneFormName("");
    setZoneFormDesc("");
    setZoneFormCapacity("");
    setZoneFormColor(PREMIUM_COLORS[Math.floor(Math.random() * PREMIUM_COLORS.length)].hex);
    setZoneFormRoles([]);
    setZoneFormTags([]);
    setShowZoneModal(true);
  };

  // Open modal to edit existing zone metadata
  const handleEditZoneDetails = (z: ZoneResponse) => {
    setZoneFormName(z.name);
    setZoneFormDesc(z.description || "");
    setZoneFormCapacity(z.capacity ? z.capacity.toString() : "");
    setZoneFormColor(z.color || "#3b82f6");
    setZoneFormRoles(z.allowedRoles ? z.allowedRoles.split(",").filter(Boolean) : []);
    setZoneFormTags(z.accessTags ? z.accessTags.split(",").filter(Boolean) : []);
    setShowZoneModal(true);
  };

  // Select zone for polygon boundary editing on map
  const handleSelectZoneForEditing = (z: ZoneResponse) => {
    setActiveZoneId(z.id);
    setEditingZonePoints(parseGeoJsonToPoints(z.boundaryGeoJson));
    setIsDrawingZone(false);
    setIsDrawingBoundary(false);
    setIsAddingPoint(false);
  };

  // Save zone (both create and update)
  async function handleSaveZoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneFormName.trim()) return;

    setSavingZone(true);
    setError(null);

    const capacityNum = zoneFormCapacity ? parseInt(zoneFormCapacity) : undefined;
    const allowedRolesCsv = zoneFormRoles.join(",");
    const accessTagsCsv = zoneFormTags.join(",");

    let geoJsonStr: string | null = null;

    if (activeZoneId) {
      // We are updating an existing zone
      // Construct boundary if editing coordinates exist
      if (editingZonePoints.length >= 3) {
        const coordinates = [...editingZonePoints.map((p) => [p[1], p[0]])];
        coordinates.push([editingZonePoints[0][1], editingZonePoints[0][0]]); // close
        geoJsonStr = JSON.stringify({
          type: "Polygon",
          coordinates: [coordinates]
        });
      }

      const res = await updateZone(activeZoneId, {
        name: zoneFormName,
        description: zoneFormDesc,
        capacity: capacityNum,
        color: zoneFormColor,
        allowedRoles: allowedRolesCsv,
        accessTags: accessTagsCsv,
        boundaryGeoJson: geoJsonStr
      });

      if (res.success) {
        setShowZoneModal(false);
        setActiveZoneId(null);
        setEditingZonePoints([]);
        onRefreshZones();
        alert("Pomyślnie zaktualizowano strefę.");
      } else {
        setError(res.error || "Błąd podczas aktualizacji strefy");
      }
    } else {
      // We are creating a new zone
      if (zoneDrawingPoints.length >= 3) {
        const coordinates = [...zoneDrawingPoints.map((p) => [p[1], p[0]])];
        coordinates.push([zoneDrawingPoints[0][1], zoneDrawingPoints[0][0]]); // close
        geoJsonStr = JSON.stringify({
          type: "Polygon",
          coordinates: [coordinates]
        });
      }

      const res = await createZone(eventId, {
        name: zoneFormName,
        description: zoneFormDesc,
        capacity: capacityNum,
        color: zoneFormColor,
        allowedRoles: allowedRolesCsv,
        accessTags: accessTagsCsv,
        boundaryGeoJson: geoJsonStr
      });

      if (res.success) {
        setShowZoneModal(false);
        setIsDrawingZone(false);
        setZoneDrawingPoints([]);
        onRefreshZones();
        alert("Pomyślnie utworzono strefę.");
      } else {
        setError(res.error || "Błąd podczas tworzenia strefy");
      }
    }
    setSavingZone(false);
  }

  // Save updated polygon coordinates directly
  async function handleSaveZoneCoordinates() {
    if (!activeZoneId) return;
    const z = zones.find((item) => item.id === activeZoneId);
    if (!z) return;

    if (editingZonePoints.length < 3) {
      alert("Strefa musi składać się z co najmniej 3 punktów.");
      return;
    }

    setSavingZone(true);
    setError(null);

    const coordinates = [...editingZonePoints.map((p) => [p[1], p[0]])];
    coordinates.push([editingZonePoints[0][1], editingZonePoints[0][0]]);
    const geoJsonStr = JSON.stringify({
      type: "Polygon",
      coordinates: [coordinates]
    });

    const res = await updateZone(activeZoneId, {
      name: z.name,
      description: z.description || "",
      capacity: z.capacity || undefined,
      color: z.color || "#3b82f6",
      allowedRoles: z.allowedRoles || "",
      accessTags: z.accessTags || "",
      boundaryGeoJson: geoJsonStr
    });

    if (res.success) {
      setActiveZoneId(null);
      setEditingZonePoints([]);
      onRefreshZones();
      alert("Pomyślnie zaktualizowano granice strefy.");
    } else {
      setError(res.error || "Błąd zapisu granic strefy");
    }
    setSavingZone(false);
  }

  // Delete zone
  async function handleDeleteZone(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę strefę? Spowoduje to również odpięcie jej od ewentualnych incydentów i dyżurów.")) return;
    setError(null);
    const res = await deleteZone(id);
    if (res.success) {
      if (activeZoneId === id) {
        setActiveZoneId(null);
        setEditingZonePoints([]);
      }
      onRefreshZones();
    } else {
      setError(res.error || "Nie udało się usunąć strefy");
    }
  }

  // Handle toggling of roles and tags in form
  const handleRoleToggle = (role: string) => {
    setZoneFormRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleTagToggle = (tag: string) => {
    setZoneFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
            <div className="flex flex-wrap items-center gap-3 bg-panel-bg/30 p-3 rounded-lg border border-panel-border/40">
              <button
                onClick={() => {
                  setIsDrawingBoundary(!isDrawingBoundary);
                  setIsAddingPoint(false);
                  setIsDrawingZone(false);
                  setActiveZoneId(null);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                  isDrawingBoundary
                    ? "bg-primary-blue text-white shadow-lg shadow-blue-500/25"
                    : "bg-panel-border text-text-main hover:bg-panel-border/80"
                }`}
              >
                {isDrawingBoundary ? "🛑 Zakończ rysowanie" : "✏️ Rysuj granice eventu"}
              </button>

              {isDrawingBoundary && (
                <button
                  onClick={handleSaveBoundary}
                  className="px-3 py-1.5 bg-status-ok text-white rounded text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                >
                  💾 Zapisz granice
                </button>
              )}

              {boundaryPoints.length > 0 && (
                <button
                  onClick={handleClearBoundary}
                  className="px-3 py-1.5 bg-danger-red/10 border border-danger-red/35 text-danger-red rounded text-xs font-semibold hover:bg-danger-red hover:text-white transition-all"
                >
                  🗑️ Wyczyść granice
                </button>
              )}

              <div className="h-5 w-px bg-panel-border hidden sm:block"></div>

              {/* Zone drawing actions */}
              <button
                onClick={() => {
                  if (isDrawingZone) {
                    setIsDrawingZone(false);
                  } else {
                    handleStartDrawZone();
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                  isDrawingZone
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-panel-border text-text-main hover:bg-panel-border/80"
                }`}
              >
                {isDrawingZone ? "🛑 Anuluj rysowanie strefy" : "📐 Rysuj nową strefę"}
              </button>

              {isDrawingZone && zoneDrawingPoints.length >= 3 && (
                <button
                  onClick={handleOpenZoneModalForNew}
                  className="px-3 py-1.5 bg-purple-500 text-white rounded text-xs font-semibold hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/25 animate-pulse"
                >
                  💾 Zapisz nową strefę...
                </button>
              )}

              {activeZoneId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-pink-400 font-mono animate-pulse font-semibold">Edycja obszaru strefy...</span>
                  <button
                    onClick={handleSaveZoneCoordinates}
                    className="px-3 py-1.5 bg-pink-600 text-white rounded text-xs font-semibold hover:bg-pink-700 transition-colors shadow-lg shadow-pink-500/25"
                  >
                    💾 Zapisz obszar strefy
                  </button>
                  <button
                    onClick={() => {
                      setActiveZoneId(null);
                      setEditingZonePoints([]);
                    }}
                    className="px-3 py-1.5 bg-panel-border text-text-muted hover:text-text-main rounded text-xs font-semibold"
                  >
                    Anuluj
                  </button>
                </div>
              )}

              <div className="h-5 w-px bg-panel-border hidden sm:block"></div>

              <button
                onClick={() => {
                  setIsAddingPoint(!isAddingPoint);
                  setIsDrawingBoundary(false);
                  setIsDrawingZone(false);
                  setActiveZoneId(null);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
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
              onUpdateBoundaryPoint={handleUpdateBoundaryPoint}
              onMapClick={handleMapClick}
              strategicPoints={points}
              onDeletePoint={handleDeletePoint}
              isDrawingBoundary={isDrawingBoundary}
              isAddingPoint={isAddingPoint}
              zones={zones}
              activeZoneId={activeZoneId}
              isDrawingZone={isDrawingZone}
              zoneDrawingPoints={zoneDrawingPoints}
              onUpdateZoneDrawingPoint={handleUpdateZoneDrawingPoint}
              editingZonePoints={editingZonePoints}
              onUpdateEditingZonePoint={handleUpdateEditingZonePoint}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Indoor Header */}
            <div className="p-3 bg-panel-bg border border-panel-border rounded text-xs text-text-muted">
              💡 Rzut budynku: Kliknij w dowolne miejsce na planie budynku poniżej, aby umieścić punkt strategiczny. Rysowanie stref nie jest dostępne na rzutach płaskich.
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

      {/* Sidebar (ColSpan 1) */}
      <div className="flex flex-col space-y-6">
        {/* Points Sidebar */}
        <div className="dashboard-panel p-5 flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-panel-border">
            <h3 className="font-medium text-text-main text-sm">Punkty Strategiczne</h3>
            <span className="bg-panel-border text-text-muted text-[10px] px-2 py-0.5 rounded font-bold">
              {points.length}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-danger-red/10 border border-danger-red/50 text-danger-red rounded text-xs text-center">
              {error}
            </div>
          )}

          {points.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-xs">
              Brak dodanych punktów.
              {isOutdoor ? " Włącz tryb dodawania i kliknij na mapie." : " Kliknij na obraz planu budynku."}
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1">
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
                    className="p-2.5 border border-panel-border/40 bg-panel-bg/30 rounded flex justify-between items-center group hover:bg-panel-bg/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-semibold text-text-main text-xs truncate" title={pt.name}>
                        {pt.name}
                      </p>
                      <span className={`inline-block border rounded px-1.5 py-0.5 text-[8px] font-bold mt-1 uppercase ${badgeColor}`}>
                        {pt.type}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePoint(pt.id)}
                      className="text-text-muted hover:text-danger-red transition-colors text-xs p-1"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Zones Sidebar */}
        {isOutdoor && (
          <div className="dashboard-panel p-5 flex flex-col space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-panel-border">
              <h3 className="font-medium text-text-main text-sm">Strefy i Kontrola (ACL)</h3>
              <span className="bg-panel-border text-text-muted text-[10px] px-2 py-0.5 rounded font-bold">
                {zones.length}
              </span>
            </div>

            {zones.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs space-y-2">
                <p>Brak stref na mapie.</p>
                <button
                  onClick={handleStartDrawZone}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded text-[10px] font-bold border border-purple-500/30 transition-all"
                >
                  ⚡ Rozpocznij rysowanie strefy
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[350px] pr-1">
                {zones.map((z) => {
                  const hasAcl = z.allowedRoles || z.accessTags;
                  const isEditingThis = activeZoneId === z.id;

                  return (
                    <div
                      key={z.id}
                      className={`p-3 border rounded transition-all ${
                        isEditingThis
                          ? "border-pink-500 bg-pink-500/5 shadow-lg shadow-pink-500/5"
                          : "border-panel-border/40 bg-panel-bg/30 hover:bg-panel-bg/60"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                            style={{ backgroundColor: z.color || "#3b82f6" }}
                          ></span>
                          <span className="font-bold text-text-main text-xs truncate" title={z.name}>
                            {z.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              handleSelectZoneForEditing(z);
                            }}
                            title="Edytuj obszar na mapie"
                            className="text-text-muted hover:text-pink-500 text-xs p-0.5"
                          >
                            🗺️
                          </button>
                          <button
                            onClick={() => handleEditZoneDetails(z)}
                            title="Edytuj szczegóły i ACL"
                            className="text-text-muted hover:text-primary-blue text-xs p-0.5"
                          >
                            ⚙️
                          </button>
                          <button
                            onClick={() => handleDeleteZone(z.id)}
                            title="Usuń strefę"
                            className="text-text-muted hover:text-danger-red text-xs p-0.5"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {z.description && (
                        <p className="text-[10px] text-text-muted truncate mt-1 italic">{z.description}</p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-1.5 items-center justify-between text-[9px]">
                        <span className="bg-panel-border/60 text-text-muted px-1.5 py-0.5 rounded font-medium">
                          Poj.: {z.capacity || "∞"}
                        </span>
                        
                        {hasAcl ? (
                          <span className="text-amber-500 font-bold flex items-center gap-0.5">
                            🔒 ACL aktywny
                          </span>
                        ) : (
                          <span className="text-status-ok font-bold">🔓 Otwarta</span>
                        )}
                      </div>

                      {hasAcl && (
                        <div className="mt-2 pt-2 border-t border-panel-border/30 flex flex-wrap gap-1">
                          {z.allowedRoles &&
                            z.allowedRoles.split(",").filter(Boolean).map((r) => (
                              <span
                                key={r}
                                className="bg-blue-500/15 text-blue-400 border border-blue-500/25 px-1 rounded text-[8px] font-bold"
                              >
                                {r}
                              </span>
                            ))}
                          {z.accessTags &&
                            z.accessTags.split(",").filter(Boolean).map((t) => (
                              <span
                                key={t}
                                className="bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1 rounded text-[8px] font-bold"
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Details / ACL Modal Form */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[9999] backdrop-blur-md">
          <div className="dashboard-panel max-w-lg w-full p-6 space-y-5 bg-panel-bg border border-panel-border rounded-lg shadow-2xl animate-fade-in text-text-main max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2.5 border-b border-panel-border">
              <h3 className="text-base font-semibold">
                {activeZoneId ? "Edytuj Szczegóły Strefy i ACL" : "Nowa Strefa Bezpieczeństwa"}
              </h3>
              <button
                onClick={() => setShowZoneModal(false)}
                className="text-text-muted hover:text-text-main text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveZoneSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left col */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted">Nazwa strefy</label>
                    <input
                      type="text"
                      required
                      value={zoneFormName}
                      onChange={(e) => setZoneFormName(e.target.value)}
                      className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                      placeholder="np. Sektor VIP"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted">Opis</label>
                    <textarea
                      value={zoneFormDesc}
                      onChange={(e) => setZoneFormDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue h-20"
                      placeholder="np. Strefa ograniczonego dostępu..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted">Maks. pojemność (opcjonalnie)</label>
                    <input
                      type="number"
                      value={zoneFormCapacity}
                      onChange={(e) => setZoneFormCapacity(e.target.value)}
                      className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                      placeholder="brak limitu"
                    />
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-muted">Kolor na mapie</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PREMIUM_COLORS.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setZoneFormColor(col.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center`}
                          style={{
                            backgroundColor: col.hex,
                            borderColor: zoneFormColor === col.hex ? '#ffffff' : 'transparent',
                          }}
                          title={col.name}
                        >
                          {zoneFormColor === col.hex && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right col - Access Control List */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l border-panel-border/50 md:pl-4">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Kontrola Dostępu (ACL)</h4>
                  <p className="text-[10px] text-text-muted italic">
                    Strefa jest otwarta dla każdego, dopóki nie zaznaczysz poniższych opcji. Zaznaczenie ograniczy wstęp tylko do wybranych ról lub tagów.
                  </p>

                  {/* Roles */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-primary-blue">Role Pracownicze</span>
                    <div className="space-y-1.5">
                      {SYSTEM_ROLES.map((r) => {
                        const checked = zoneFormRoles.includes(r);
                        return (
                          <label key={r} className="flex items-center space-x-2 text-xs cursor-pointer group text-text-muted hover:text-text-main">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleRoleToggle(r)}
                              className="rounded bg-dashboard-bg border-panel-border text-primary-blue focus:ring-primary-blue/30"
                            />
                            <span className={checked ? "text-text-main font-semibold" : ""}>{r}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2 pt-2 border-t border-panel-border/30">
                    <span className="text-[11px] font-bold text-amber-500">Kategorie Przepustek (Goście)</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ACCESS_TAGS.map((t) => {
                        const checked = zoneFormTags.includes(t);
                        return (
                          <label key={t} className="flex items-center space-x-2 text-xs cursor-pointer group text-text-muted hover:text-text-main">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleTagToggle(t)}
                              className="rounded bg-dashboard-bg border-panel-border text-amber-500 focus:ring-amber-500/30"
                            />
                            <span className={checked ? "text-text-main font-semibold" : ""}>{t}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3.5 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 border border-panel-border text-text-muted rounded hover:text-text-main text-xs font-semibold"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingZone}
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  {savingZone ? "Zapisywanie..." : activeZoneId ? "Zapisz Strefę" : "Utwórz Strefę"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
