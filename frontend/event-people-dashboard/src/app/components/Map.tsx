"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocationLog } from "../../types/location";

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
}

export default function Map({ locations, isConnected }: MapProps) {
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
          center={[52.2297, 21.0122]} 
          zoom={13} 
          scrollWheelZoom={true} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
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
