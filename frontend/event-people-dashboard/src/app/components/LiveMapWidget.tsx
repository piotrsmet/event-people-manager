"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLiveLocations } from "../../hooks/useLiveLocations";
import { EventResponse } from "../../types/event";
import { StrategicPointResponse } from "../../types/strategicPoint";
import { ShiftResponse } from "../../types/shift";
import { getStrategicPoints } from "../actions/strategicPoint";
import { getActiveShifts } from "../actions/shift";

// Disable SSR for Map due to window object in Leaflet
const MapComponent = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-dashboard-bg border border-panel-border rounded-lg">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm font-medium">Ładowanie mapy satelitarnej...</p>
      </div>
    </div>
  ),
});

interface LiveMapWidgetProps {
  token: string;
  memberUserIds: string[];
  activeEvent: EventResponse | null;
}

export default function LiveMapWidget({ token, memberUserIds, activeEvent }: LiveMapWidgetProps) {
  const { locations, isConnected } = useLiveLocations(token);
  const [strategicPoints, setStrategicPoints] = useState<StrategicPointResponse[]>([]);
  const [activeShifts, setActiveShifts] = useState<ShiftResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeEvent) {
      loadMapFeatures();
      // Poll active shifts every 10 seconds for real-time indoor volunteer updates
      const interval = setInterval(loadMapFeatures, 10000);
      return () => clearInterval(interval);
    }
  }, [activeEvent]);

  async function loadMapFeatures() {
    if (!activeEvent) return;
    try {
      const [ptsRes, shiftsRes] = await Promise.all([
        getStrategicPoints(activeEvent.id),
        getActiveShifts(activeEvent.id),
      ]);

      if (ptsRes.success && ptsRes.data) {
        setStrategicPoints(ptsRes.data);
      }
      if (shiftsRes.success && shiftsRes.data) {
        setActiveShifts(shiftsRes.data);
      }
    } catch (err) {
      console.error("Błąd wczytywania danych mapy:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!activeEvent) return null;

  const isOutdoor = activeEvent.outdoor !== false;
  const filteredLocations = locations.filter((loc) => memberUserIds.includes(loc.userId));

  if (loading) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center space-y-4 bg-dashboard-bg border border-panel-border rounded-lg">
        <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm font-medium">Wczytywanie obiektów mapy...</p>
      </div>
    );
  }

  if (isOutdoor) {
    return (
      <MapComponent
        locations={filteredLocations}
        isConnected={isConnected}
        boundaryGeoJson={activeEvent.boundaryGeoJson}
        strategicPoints={strategicPoints}
      />
    );
  }

  // INDOOR VIEW
  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Indoor Status Bar */}
      <div className="flex items-center justify-between border-b border-panel-border pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-status-ok animate-pulse shadow-[0_0_8px_#10b981]"></span>
          <span className="text-sm font-medium text-text-main">
            Podgląd Wewnętrzny (Plan Budynku)
          </span>
        </div>
        <div className="text-xs text-text-muted">
          Aktywne dyżury: <span className="font-semibold text-text-main">{activeShifts.length}</span>
        </div>
      </div>

      {/* Plan Container */}
      <div className="w-full border border-panel-border rounded-lg bg-black/40 flex justify-center items-center p-6 min-h-[500px] relative overflow-hidden">
        {activeEvent.buildingPlanBase64 ? (
          <div className="relative max-w-full max-h-[700px] select-none">
            <img
              src={activeEvent.buildingPlanBase64}
              alt="Plan budynku"
              className="max-w-full max-h-[600px] object-contain pointer-events-none"
            />

            {/* Render Strategic Points & Volunteers on top of the image */}
            {strategicPoints.map((pt) => {
              if (pt.xRatio === undefined || pt.yRatio === undefined) return null;

              let color = "#3b82f6";
              let symbol = "📍";
              if (pt.type === "MEDICAL") { color = "#ef4444"; symbol = "🏥"; }
              else if (pt.type === "SECURITY") { color = "#f59e0b"; symbol = "🛡️"; }
              else if (pt.type === "ENTRANCE") { color = "#10b981"; symbol = "🚪"; }
              else if (pt.type === "STAGE") { color = "#8b5cf6"; symbol = "🎭"; }
              else if (pt.type === "INFO") { color = "#06b6d4"; symbol = "ℹ️"; }

              // Find volunteers who are active in the zone associated with this strategic point (matched by name)
              const volunteersInZone = activeShifts.filter(
                (shift) => shift.zoneName && shift.zoneName.toLowerCase() === pt.name.toLowerCase()
              );

              return (
                <div
                  key={pt.id}
                  className="absolute w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm shadow-xl group cursor-pointer"
                  style={{
                    left: `${pt.xRatio * 100}%`,
                    top: `${pt.yRatio * 100}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: color,
                  }}
                >
                  {symbol}

                  {/* Volunteer count indicator if there are volunteers in this zone */}
                  {volunteersInZone.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-status-ok text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white animate-bounce shadow-md">
                      {volunteersInZone.length}
                    </span>
                  )}

                  {/* Overlapping Volunteer Avatars clustered under the point */}
                  {volunteersInZone.length > 0 && (
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 flex -space-x-2.5">
                      {volunteersInZone.slice(0, 3).map((v, idx) => (
                        <div
                          key={v.id}
                          className="w-6 h-6 rounded-full bg-slate-700 border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md uppercase"
                          title={v.username}
                        >
                          {v.username.slice(0, 2)}
                        </div>
                      ))}
                      {volunteersInZone.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-slate-600 border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                          +{volunteersInZone.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hover Info Tooltip */}
                  <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-panel-bg/95 border border-panel-border px-3 py-2 rounded shadow-2xl text-xs text-text-main pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-48 z-50 text-center">
                    <p className="font-bold text-sm truncate">{pt.name}</p>
                    <p className="text-text-muted mt-0.5 uppercase tracking-wider text-[9px]">{pt.type}</p>
                    {volunteersInZone.length > 0 ? (
                      <div className="mt-2 border-t border-panel-border pt-1.5 text-left">
                        <p className="text-[10px] text-text-muted font-semibold mb-1">Aktywni wolontariusze:</p>
                        <ul className="space-y-0.5">
                          {volunteersInZone.map((v) => (
                            <li key={v.id} className="text-[10px] text-status-ok font-medium truncate">
                              • {v.username}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-muted mt-2">Brak obsady w tej strefie</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-12">
            Brak wgranego planu budynku dla tego wydarzenia.
          </div>
        )}
      </div>
    </div>
  );
}
