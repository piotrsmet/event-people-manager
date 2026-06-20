import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { api, ZoneResponse } from "../services/api";
import MapScreen from "./MapScreen";
import ChatScreen from "./ChatScreen";

type IncidentType = "MEDICAL" | "SECURITY" | "LOGISTICS" | "OTHER";

export default function ShiftScreen() {
  const {
    user,
    selectedEvent,
    myEvents,
    activeShiftId,
    activeZoneId,
    activeShiftStartTime,
    startShift,
    endShift,
    signOut,
    selectEvent,
    loadEvents,
  } = useAuth();

  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(undefined);
  const [loadingZones, setLoadingZones] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Stoper
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  
  // SOS Modal
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [sosType, setSosType] = useState<IncidentType>("SECURITY");
  const [sosDescription, setSosDescription] = useState("");
  const [sosSending, setSosSending] = useState(false);

  // Status GPS w tle/pierwszym planie
  const [gpsPermissionGranted, setGpsPermissionGranted] = useState<boolean | null>(null);

  // Zmiana i dołączanie do wydarzeń
  const [changeEventModalVisible, setChangeEventModalVisible] = useState(false);
  const [joinEventModalVisible, setJoinEventModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joiningEvent, setJoiningEvent] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Mapa i Chat
  const [showMap, setShowMap] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Referencje do cykli
  const locationIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // 1. Ładowanie stref przy wejściu na ekran
  useEffect(() => {
    if (selectedEvent) {
      loadZones();
    }
  }, [selectedEvent]);

  const loadZones = async () => {
    if (!selectedEvent) return;
    setLoadingZones(true);
    try {
      const fetchedZones = await api.getZones(selectedEvent.id);
      setZones(fetchedZones);
    } catch (err) {
      console.warn("Nie udało się załadować stref:", err);
    } finally {
      setLoadingZones(false);
    }
  };

  // 2. Obsługa stopera
  useEffect(() => {
    if (activeShiftId && activeShiftStartTime) {
      // Uruchom stoper
      timerIntervalRef.current = setInterval(() => {
        const start = new Date(activeShiftStartTime).getTime();
        const now = Date.now();
        const diffMs = now - start;

        if (diffMs > 0) {
          const diffSec = Math.floor(diffMs / 1000);
          const hrs = Math.floor(diffSec / 3600);
          const mins = Math.floor((diffSec % 3600) / 60);
          const secs = diffSec % 60;

          const formatted = [
            hrs.toString().padStart(2, "0"),
            mins.toString().padStart(2, "0"),
            secs.toString().padStart(2, "0"),
          ].join(":");
          setElapsedTime(formatted);
        }
      }, 1000);
    } else {
      setElapsedTime("00:00:00");
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeShiftId, activeShiftStartTime]);

  // 3. Obsługa wysyłania lokalizacji GPS co 15 sekund
  useEffect(() => {
    if (activeShiftId) {
      requestLocationPermission().then((granted) => {
        if (granted) {
          // Natychmiast wyślij pierwszą pozycję
          sendCurrentLocation();
          
          // Uruchom cykl co 15 sekund
          locationIntervalRef.current = setInterval(() => {
            sendCurrentLocation();
          }, 15000);
        }
      });
    } else {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [activeShiftId]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setGpsPermissionGranted(granted);
      return granted;
    } catch (e) {
      console.warn("Błąd uprawnień GPS:", e);
      setGpsPermissionGranted(false);
      return false;
    }
  };

  const sendCurrentLocation = async () => {
    if (!user) return;
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await api.sendLocation(
        user.id,
        activeShiftId,
        loc.coords.latitude,
        loc.coords.longitude
      );
      console.log("GPS zaktualizowany:", loc.coords.latitude, loc.coords.longitude);
    } catch (err) {
      console.warn("Nie udało się wysłać lokalizacji GPS:", err);
    }
  };

  // 4. Obsługa zmiany Check-in / Check-out
  const handleStartShift = async () => {
    setActionLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert("Uprawnienia GPS", "Aplikacja wymaga dostępu do lokalizacji, aby zarejestrować zmianę.");
        setActionLoading(false);
        return;
      }
      await startShift(selectedZoneId);
    } catch (err: any) {
      Alert.alert("Błąd", err.message || "Nie udało się rozpocząć zmiany");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    setActionLoading(true);
    try {
      await endShift();
    } catch (err: any) {
      Alert.alert("Błąd", err.message || "Nie udało się zakończyć zmiany");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Obsługa wysyłania SOS
  const handleSendSos = async () => {
    if (!user || !selectedEvent) return;
    setSosSending(true);

    try {
      // Pobierz aktualną pozycję GPS dla SOS
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        throw new Error("Brak dostępu do lokalizacji GPS. Zezwól na lokalizację, aby wysłać SOS.");
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await api.reportIncident(
        user.id,
        selectedEvent.id,
        activeZoneId || null,
        sosType,
        sosDescription.trim() || `Zgłoszenie SOS typu: ${sosType}`,
        loc.coords.latitude,
        loc.coords.longitude
      );

      Alert.alert("Sukces", "Zgłoszenie SOS zostało przesłane do Koordynatora!");
      setSosModalVisible(false);
      setSosDescription("");
    } catch (err: any) {
      Alert.alert("Błąd wysyłania SOS", err.message || "Wystąpił nieoczekiwany problem.");
    } finally {
      setSosSending(false);
    }
  };

  const handleJoinNewEvent = async () => {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      setJoinError("Wpisz poprawny 6-znakowy kod.");
      return;
    }
    setJoinError(null);
    setJoiningEvent(true);
    try {
      const prevIds = myEvents.map((e) => e.id);
      await api.joinEvent(cleanCode);
      await loadEvents();
      
      const updatedEvents = await api.getMyEvents();
      const newEvent = updatedEvents.find((e) => !prevIds.includes(e.id));
      if (newEvent) {
        await selectEvent(newEvent);
      }
      
      Alert.alert("Sukces", "Dołączono do nowego wydarzenia!");
      setJoinEventModalVisible(false);
      setInviteCode("");
    } catch (err: any) {
      setJoinError(err.message || "Błąd dołączania do wydarzenia.");
    } finally {
      setJoiningEvent(false);
    }
  };

  const getActiveZoneName = () => {
    if (!activeZoneId) return "Cały teren / Brak strefy";
    const zone = zones.find((z) => z.id === activeZoneId);
    return zone ? zone.name : "Strefa przypisana";
  };

  if (showMap) {
    return <MapScreen onClose={() => setShowMap(false)} />;
  }

  if (showChat) {
    return <ChatScreen onClose={() => setShowChat(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Top Navbar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.roleText}>Rola: {user?.role}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Wyloguj</Text>
          </TouchableOpacity>
        </View>

        {/* Event Card */}
        <View style={styles.eventCard}>
          <View style={styles.eventCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventLabel}>Aktywne Wydarzenie</Text>
              <Text style={styles.eventName}>{selectedEvent?.name}</Text>
            </View>
            {activeShiftId ? (
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>🔒 W TRAKCIE PRACY</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.eventDesc} numberOfLines={2}>
            {selectedEvent?.description || "Brak opisu wydarzenia."}
          </Text>
          
          <View style={styles.eventActionsRow}>
            <TouchableOpacity
              style={[
                styles.eventCardBtn,
                activeShiftId !== null && styles.eventCardBtnDisabled
              ]}
              disabled={activeShiftId !== null}
              onPress={() => setChangeEventModalVisible(true)}
            >
              <Text style={styles.eventCardBtnText}>🔄 Zmień ({myEvents.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.eventCardBtn,
                activeShiftId !== null && styles.eventCardBtnDisabled
              ]}
              disabled={activeShiftId !== null}
              onPress={() => setJoinEventModalVisible(true)}
            >
              <Text style={styles.eventCardBtnText}>➕ Dołącz kodem</Text>
            </TouchableOpacity>
          </View>

          {/* Map Button */}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMap(true)}
          >
            <Text style={styles.mapButtonText}>🗺️ Pokaż mapę wydarzenia</Text>
          </TouchableOpacity>

          {/* Chat Button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => setShowChat(true)}
          >
            <Text style={styles.chatButtonText}>💬 Otwórz czat wydarzenia</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Permission Warning */}
        {gpsPermissionGranted === false && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Brak uprawnień do GPS. Aplikacja nie może przesyłać Twojej lokalizacji. Zezwól na dostęp w ustawieniach telefonu.
            </Text>
          </View>
        )}

        {/* Main Status Panel */}
        {!activeShiftId ? (
          /* STAN: PRZED ROZPOCZĘCIEM PRACY */
          <View style={styles.statusPanel}>
            <Text style={styles.panelTitle}>Rozpocznij pracę</Text>
            <Text style={styles.panelSubtitle}>
              Wybierz strefę, w której będziesz stacjonować (opcjonalnie):
            </Text>

            {loadingZones ? (
              <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.zoneSelectorContainer}>
                <TouchableOpacity
                  style={[
                    styles.zoneOption,
                    selectedZoneId === undefined && styles.zoneOptionSelected,
                  ]}
                  onPress={() => setSelectedZoneId(undefined)}
                >
                  <Text
                    style={[
                      styles.zoneOptionText,
                      selectedZoneId === undefined && styles.zoneOptionTextSelected,
                    ]}
                  >
                    Cały Teren / Brak strefy
                  </Text>
                </TouchableOpacity>

                {zones.map((zone) => (
                  <TouchableOpacity
                    key={zone.id}
                    style={[
                      styles.zoneOption,
                      selectedZoneId === zone.id && styles.zoneOptionSelected,
                    ]}
                    onPress={() => setSelectedZoneId(zone.id)}
                  >
                    <Text
                      style={[
                        styles.zoneOptionText,
                        selectedZoneId === zone.id && styles.zoneOptionTextSelected,
                      ]}
                    >
                      {zone.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartShift}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>ROZPOCZNIJ ZMIANĘ</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* STAN: W TRAKCIE PRACY (CHECKED IN) */
          <View style={styles.statusPanel}>
            <View style={styles.activeHeader}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeStatusText}>JESTEŚ NA ZMIANIE</Text>
              </View>
            </View>

            <Text style={styles.activeZoneLabel}>Lokalizacja stacjonowania:</Text>
            <Text style={styles.activeZoneValue}>{getActiveZoneName()}</Text>

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>CZAS PRACY</Text>
              <Text style={styles.timerValue}>{elapsedTime}</Text>
            </View>

            {/* SOS Emergency Button */}
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => setSosModalVisible(true)}
            >
              <Text style={styles.sosButtonText}>SOS / ZGŁOŚ ALERT</Text>
            </TouchableOpacity>

            {/* Check-out Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.endButton]}
              onPress={handleEndShift}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>ZAKOŃCZ ZMIANĘ</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* SOS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={sosModalVisible}
        onRequestClose={() => {
          if (!sosSending) setSosModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚨 Zgłoszenie SOS</Text>
            <Text style={styles.modalSubtitle}>
              Twoja lokalizacja GPS zostanie automatycznie pobrana i wysłana wraz ze zgłoszeniem.
            </Text>

            <Text style={styles.modalLabel}>Typ zdarzenia:</Text>
            <View style={styles.sosTypesGrid}>
              {(["MEDICAL", "SECURITY", "LOGISTICS", "OTHER"] as IncidentType[]).map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.sosTypeBtn,
                      sosType === type && styles.sosTypeBtnSelected,
                      type === "MEDICAL" && sosType === type && styles.sosTypeBtnMed,
                      type === "SECURITY" && sosType === type && styles.sosTypeBtnSec,
                    ]}
                    onPress={() => setSosType(type)}
                  >
                    <Text
                      style={[
                        styles.sosTypeBtnText,
                        sosType === type && styles.sosTypeBtnTextSelected,
                      ]}
                    >
                      {type === "MEDICAL" && "🏥 MEDYCZNE"}
                      {type === "SECURITY" && "🛡️ OCHRONA"}
                      {type === "LOGISTICS" && "📦 LOGISTYKA"}
                      {type === "OTHER" && "❓ INNE"}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.modalLabel}>Krótki opis sytuacji (opcjonalnie):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="np. Omdlenie przy scenie głównej, potrzebny ratownik medyczny."
              placeholderTextColor="#64748B"
              value={sosDescription}
              onChangeText={sosDescription => setSosDescription(sosDescription)}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSosModalVisible(false)}
                disabled={sosSending}
              >
                <Text style={styles.modalBtnCancelText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSend]}
                onPress={handleSendSos}
                disabled={sosSending}
              >
                {sosSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnSendText}>WYŚLIJ SOS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANGE EVENT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={changeEventModalVisible}
        onRequestClose={() => setChangeEventModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleBlue}>🔄 Wybierz wydarzenie</Text>
            <Text style={styles.modalSubtitle}>
              Przełącz się na inne wydarzenie, do którego jesteś przypisany.
            </Text>

            <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
              {myEvents.map((evt) => (
                <TouchableOpacity
                  key={evt.id}
                  style={[
                    styles.eventSelectOption,
                    selectedEvent?.id === evt.id && styles.eventSelectOptionSelected,
                  ]}
                  onPress={async () => {
                    await selectEvent(evt);
                    setChangeEventModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.eventSelectOptionText,
                      selectedEvent?.id === evt.id && styles.eventSelectOptionTextSelected,
                    ]}
                  >
                    {evt.name}
                  </Text>
                  {selectedEvent?.id === evt.id && (
                    <Text style={styles.activeCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { width: "100%" }]}
              onPress={() => setChangeEventModalVisible(false)}
            >
              <Text style={styles.modalBtnCancelText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* JOIN EVENT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={joinEventModalVisible}
        onRequestClose={() => {
          if (!joiningEvent) setJoinEventModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitleGreen}>➕ Dołącz do wydarzenia</Text>
            <Text style={styles.modalSubtitle}>
              Wpisz 6-znakowy kod zaproszenia, aby dołączyć do nowego zespołu.
            </Text>

            {joinError && (
              <View style={[styles.errorContainer, { marginBottom: 15 }]}>
                <Text style={styles.errorText}>{joinError}</Text>
              </View>
            )}

            <TextInput
              style={[styles.modalInput, styles.codeModalInput]}
              placeholder="np. ABC123"
              placeholderTextColor="#64748B"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setJoinEventModalVisible(false);
                  setInviteCode("");
                  setJoinError(null);
                }}
                disabled={joiningEvent}
              >
                <Text style={styles.modalBtnCancelText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnJoin]}
                onPress={handleJoinNewEvent}
                disabled={joiningEvent}
              >
                {joiningEvent ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnJoinText}>Dołącz</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  username: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  roleText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 2,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  signOutText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  eventCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  eventLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    marginTop: 4,
  },
  eventDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  statusPanel: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  panelSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
  },
  zoneSelectorContainer: {
    width: "100%",
    marginBottom: 20,
  },
  zoneOption: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  zoneOptionSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  zoneOptionText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  zoneOptionTextSelected: {
    color: "#60A5FA",
  },
  actionButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  endButton: {
    backgroundColor: "#475569",
    marginTop: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  activeHeader: {
    marginBottom: 16,
  },
  pulseContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  activeStatusText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700",
  },
  activeZoneLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  activeZoneValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
    marginTop: 4,
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#F8FAFC",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginTop: 4,
  },
  sosButton: {
    backgroundColor: "#EF4444",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 10,
  },
  sosButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1E293B",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#EF4444",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalLabel: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  sosTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sosTypeBtn: {
    width: "48%",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sosTypeBtnSelected: {
    borderColor: "#EF4444",
  },
  sosTypeBtnMed: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  sosTypeBtnSec: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  sosTypeBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  sosTypeBtnTextSelected: {
    color: "#FFFFFF",
  },
  modalInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    padding: 12,
    fontSize: 14,
    height: 80,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    width: "48%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#334155",
  },
  modalBtnCancelText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBtnSend: {
    backgroundColor: "#EF4444",
  },
  modalBtnSendText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  eventCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lockedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockedBadgeText: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
  },
  eventActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
  },
  eventCardBtn: {
    backgroundColor: "#2E3A52",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: "48%",
    alignItems: "center",
  },
  eventCardBtnDisabled: {
    opacity: 0.5,
  },
  eventCardBtnText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  modalTitleBlue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3B82F6",
    textAlign: "center",
  },
  modalTitleGreen: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10B981",
    textAlign: "center",
  },
  eventSelectOption: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventSelectOptionSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  eventSelectOptionText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  eventSelectOptionTextSelected: {
    color: "#60A5FA",
  },
  activeCheckmark: {
    color: "#60A5FA",
    fontWeight: "900",
    fontSize: 16,
  },
  codeModalInput: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    height: 60,
  },
  modalBtnJoin: {
    backgroundColor: "#10B981",
  },
  modalBtnJoinText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    fontWeight: "500",
  },
  mapButton: {
    marginTop: 12,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  mapButtonText: {
    color: "#60A5FA",
    fontSize: 14,
    fontWeight: "700",
  },
  chatButton: {
    marginTop: 12,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  chatButtonText: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "700",
  },
});
