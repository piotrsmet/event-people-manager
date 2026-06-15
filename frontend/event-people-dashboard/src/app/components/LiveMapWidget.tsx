"use client";

import dynamic from "next/dynamic";
import { useLiveLocations } from "../../hooks/useLiveLocations";

// Wyłączamy SSR dla komponentu mapy z powodu obiektu 'window' w ulotkach (Leaflet)
const MapComponent = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-dashboard-bg border border-panel-border rounded-lg">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-text-muted text-sm font-medium">Ładowanie mapy satelitarnej...</p>
      </div>
    </div>
  )
});

export default function LiveMapWidget({ token, memberUserIds = [] }: { token: string; memberUserIds?: string[] }) {
  const { locations, isConnected } = useLiveLocations(token);

  // Filtrujemy lokalizacje, pokazując tylko pozycje wolontariuszy przypisanych do wybranego wydarzenia
  const filteredLocations = locations.filter(loc => memberUserIds.includes(loc.userId));

  return <MapComponent locations={filteredLocations} isConnected={isConnected} />;
}
