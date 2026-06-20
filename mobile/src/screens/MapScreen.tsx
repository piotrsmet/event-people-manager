import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { api, ZoneResponse } from "../services/api";
import { StrategicPointResponse } from "../services/api/strategicPoint";

interface MapScreenProps {
  onClose: () => void;
}

export default function MapScreen({ onClose }: MapScreenProps) {
  const { selectedEvent, user } = useAuth();
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [points, setPoints] = useState<StrategicPointResponse[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadMapData();
    startLocationTracking();
  }, []);

  const loadMapData = async () => {
    if (!selectedEvent) return;
    try {
      const [fetchedZones, fetchedPoints] = await Promise.all([
        api.getZones(selectedEvent.id),
        api.getStrategicPoints(selectedEvent.id),
      ]);
      setZones(fetchedZones);
      setPoints(fetchedPoints);
    } catch (err) {
      console.warn("Błąd ładowania danych mapy:", err);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      // Update location every 5 seconds
      const interval = setInterval(async () => {
        try {
          const newLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            lat: newLoc.coords.latitude,
            lng: newLoc.coords.longitude,
          });
          // Send location update to WebView
          webViewRef.current?.injectJavaScript(`
            if (window.updateUserLocation) {
              window.updateUserLocation(${newLoc.coords.latitude}, ${newLoc.coords.longitude});
            }
            true;
          `);
        } catch (_) { /* ignore */ }
      }, 5000);

      return () => clearInterval(interval);
    } catch (e) {
      console.warn("Błąd GPS:", e);
    }
  };

  const generateLeafletHTML = () => {
    // Parse boundary
    let boundaryCoords: number[][] = [];
    if (selectedEvent?.boundaryGeoJson) {
      try {
        const geo = JSON.parse(selectedEvent.boundaryGeoJson);
        if (geo.type === "Polygon" && geo.coordinates?.[0]) {
          boundaryCoords = geo.coordinates[0].map((c: number[]) => [c[1], c[0]]);
        }
      } catch (_) { /* ignore */ }
    }

    // Parse zones
    const zonesData = zones.map((z) => {
      let coords: number[][] = [];
      if (z.boundaryGeoJson) {
        try {
          const geo = JSON.parse(z.boundaryGeoJson);
          if (geo.type === "Polygon" && geo.coordinates?.[0]) {
            coords = geo.coordinates[0].map((c: number[]) => [c[1], c[0]]);
          }
        } catch (_) { /* ignore */ }
      }
      return {
        name: z.name,
        description: z.description || "",
        color: z.color || "#3b82f6",
        capacity: z.capacity,
        coords,
        allowedRoles: z.allowedRoles || "",
        accessTags: z.accessTags || "",
      };
    });

    // Parse strategic points (only outdoor ones with lat/lng)
    const pointsData = points
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        name: p.name,
        type: p.type,
        lat: p.latitude!,
        lng: p.longitude!,
      }));

    // Determine map center
    let centerLat = 52.2297;
    let centerLng = 21.0122;
    let defaultZoom = 13;

    if (userLocation) {
      centerLat = userLocation.lat;
      centerLng = userLocation.lng;
      defaultZoom = 16;
    } else if (boundaryCoords.length > 0) {
      centerLat = boundaryCoords.reduce((s, c) => s + c[0], 0) / boundaryCoords.length;
      centerLng = boundaryCoords.reduce((s, c) => s + c[1], 0) / boundaryCoords.length;
      defaultZoom = 15;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0F172A; }
    #map { width: 100%; height: 100%; }
    .leaflet-popup-content-wrapper {
      background: rgba(15, 23, 42, 0.95) !important;
      border: 1px solid rgba(148, 163, 184, 0.2) !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
    }
    .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95) !important; }
    .leaflet-popup-content { margin: 8px 12px !important; font-family: -apple-system, system-ui, sans-serif; font-size: 12px; }
    .popup-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .popup-type { color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .popup-zone-name { font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .popup-zone-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }
    .popup-desc { color: #94a3b8; font-size: 10px; font-style: italic; margin-top: 4px; }
    .popup-acl { margin-top: 6px; padding: 4px 6px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 9px; }
    .popup-acl-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; margin: 1px 2px; }

    .user-marker {
      width: 16px; height: 16px; background: #3B82F6; border: 3px solid #fff;
      border-radius: 50%; box-shadow: 0 0 12px rgba(59,130,246,0.6), 0 0 24px rgba(59,130,246,0.3);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.6); }
      50% { box-shadow: 0 0 24px rgba(59,130,246,0.9), 0 0 48px rgba(59,130,246,0.4); }
    }

    .point-marker {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${centerLat}, ${centerLng}],
      zoom: ${defaultZoom},
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Attribution in corner
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© OpenStreetMap')
      .addTo(map);

    // Event boundary
    var boundary = ${JSON.stringify(boundaryCoords)};
    if (boundary.length >= 3) {
      L.polygon(boundary, {
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 2.5, dashArray: '8, 4'
      }).addTo(map);
    }

    // Zones
    var zones = ${JSON.stringify(zonesData)};
    zones.forEach(function(z) {
      if (z.coords.length >= 3) {
        var polygon = L.polygon(z.coords, {
          color: z.color, fillColor: z.color, fillOpacity: 0.2, weight: 2
        }).addTo(map);

        var popupHtml = '<div class="popup-zone-name"><span class="popup-zone-dot" style="background:' + z.color + '"></span>' + z.name + '</div>';
        if (z.description) popupHtml += '<div class="popup-desc">' + z.description + '</div>';
        popupHtml += '<div style="margin-top:4px;color:#94a3b8;font-size:10px;">Pojemność: <strong style="color:#e2e8f0;">' + (z.capacity ? z.capacity + ' osób' : 'Bez limitu') + '</strong></div>';

        if (z.allowedRoles || z.accessTags) {
          popupHtml += '<div class="popup-acl">🔒 <strong style="color:#f59e0b;">ACL</strong><br/>';
          if (z.allowedRoles) {
            z.allowedRoles.split(',').filter(Boolean).forEach(function(r) {
              popupHtml += '<span class="popup-acl-badge" style="background:rgba(59,130,246,0.2);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">' + r + '</span>';
            });
          }
          if (z.accessTags) {
            z.accessTags.split(',').filter(Boolean).forEach(function(t) {
              popupHtml += '<span class="popup-acl-badge" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);">' + t + '</span>';
            });
          }
          popupHtml += '</div>';
        } else {
          popupHtml += '<div style="margin-top:4px;color:#10b981;font-size:10px;font-weight:600;">🔓 Strefa otwarta</div>';
        }

        polygon.bindPopup(popupHtml);
      }
    });

    // Strategic points
    var points = ${JSON.stringify(pointsData)};
    var typeConfig = {
      'MEDICAL': { color: '#ef4444', symbol: '🏥' },
      'SECURITY': { color: '#f59e0b', symbol: '🛡️' },
      'ENTRANCE': { color: '#10b981', symbol: '🚪' },
      'STAGE': { color: '#8b5cf6', symbol: '🎭' },
      'INFO': { color: '#06b6d4', symbol: 'ℹ️' },
      'OTHER': { color: '#3b82f6', symbol: '📍' },
    };

    points.forEach(function(p) {
      var cfg = typeConfig[p.type] || typeConfig['OTHER'];
      var icon = L.divIcon({
        html: '<div class="point-marker" style="background:' + cfg.color + ';">' + cfg.symbol + '</div>',
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([p.lat, p.lng], { icon: icon })
        .bindPopup('<div class="popup-title">' + p.name + '</div><div class="popup-type">' + p.type + '</div>')
        .addTo(map);
    });

    // User location marker
    var userMarker = null;
    var userAccuracyCircle = null;
    ${userLocation ? `
    var userIcon = L.divIcon({
      html: '<div class="user-marker"></div>',
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    userMarker = L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup('<div class="popup-title">📍 Twoja pozycja</div><div class="popup-type">${user?.username || "Ty"}</div>')
      .addTo(map);
    userAccuracyCircle = L.circle([${userLocation.lat}, ${userLocation.lng}], {
      radius: 30, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1
    }).addTo(map);
    ` : ''}

    // Function to update user location from React Native
    window.updateUserLocation = function(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
        if (userAccuracyCircle) userAccuracyCircle.setLatLng([lat, lng]);
      } else {
        var userIcon = L.divIcon({
          html: '<div class="user-marker"></div>',
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
          .bindPopup('<div class="popup-title">📍 Twoja pozycja</div>')
          .addTo(map);
        userAccuracyCircle = L.circle([lat, lng], {
          radius: 30, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.08, weight: 1
        }).addTo(map);
      }
    };

    // Center on user button handler
    window.centerOnUser = function() {
      if (userMarker) {
        map.setView(userMarker.getLatLng(), 17, { animate: true });
      }
    };
  </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Ładowanie mapy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>← Wróć</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🗺️ Mapa wydarzenia</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {selectedEvent?.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            webViewRef.current?.injectJavaScript("window.centerOnUser(); true;");
          }}
        >
          <Text style={styles.locationButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
          <Text style={styles.legendText}>Ty</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🏥</Text>
          <Text style={styles.legendText}>Medyczny</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🛡️</Text>
          <Text style={styles.legendText}>Ochrona</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🚪</Text>
          <Text style={styles.legendText}>Wejście</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🎭</Text>
          <Text style={styles.legendText}>Scena</Text>
        </View>
      </View>

      {/* WebView Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateLeafletHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(148, 163, 184, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  backButtonText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },
  headerTitle: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationButtonText: {
    fontSize: 18,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fff",
  },
  legendIcon: {
    fontSize: 12,
  },
  legendText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "500",
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
});
