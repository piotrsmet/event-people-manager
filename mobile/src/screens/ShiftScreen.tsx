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
import { api, ZoneResponse, StaffingRequestResponse, ShiftResponse, NotificationResponse } from "../services/api";
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

  // Własne role i zapotrzebowania
  const [myMemberDetails, setMyMemberDetails] = useState<any>(null);
  const [staffingRequests, setStaffingRequests] = useState<StaffingRequestResponse[]>([]);
  const [activeShift, setActiveShift] = useState<ShiftResponse | null>(null);
  const [loadingStaffing, setLoadingStaffing] = useState(false);
  const [reactLoading, setReactLoading] = useState<string | null>(null);

  // Powiadomienia
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Referencje do cykli
  const locationIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const dataIntervalRef = useRef<any>(null);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const triggerLocalNotification = async (title: string, body: string) => {
    try {
      if (Platform.OS === "web") return;
      const Notifications = require("expo-notifications");
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body || "",
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.log("Błąd wysyłania powiadomienia lokalnego (brak obsługi w Expo Go):", e);
    }
  };

  // Zezwolenie na powiadomienia lokalne i inicjalizacja handlera
  useEffect(() => {
    const initNotifications = async () => {
      if (Platform.OS === "web") return;
      try {
        const Notifications = require("expo-notifications");
        
        // Dynamiczna rejestracja handlera
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Brak uprawnień do powiadomień.");
        }
      } catch (err) {
        console.log("Powiadomienia lokalne nie są obsługiwane w tym środowisku Expo Go:", err);
      }
    };
    initNotifications();
  }, []);

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

  // Ładowanie ról, zapotrzebowań, statusu aktywnej zmiany oraz powiadomień co 5 sekund
  useEffect(() => {
    if (!selectedEvent || !user) {
      setMyMemberDetails(null);
      setStaffingRequests([]);
      setActiveShift(null);
      setNotifications([]);
      return;
    }

    const loadData = async () => {
      try {
        const details = await api.getMemberDetails(selectedEvent.id);
        setMyMemberDetails(details);
      } catch (err) {
        console.warn("Nie udało się pobrać uprawnień:", err);
      }

      try {
        const reqs = await api.getStaffingRequests(selectedEvent.id);
        setStaffingRequests(reqs.filter((r) => r.status === "OPEN"));
      } catch (err) {
        console.warn("Nie udało się pobrać zapotrzebowań:", err);
      }

      try {
        const notifs = await api.getMyNotifications(selectedEvent.id);
        console.log("Powiadomienia z serwera:", JSON.stringify(notifs));

        if (isFirstLoad.current) {
          notifs.forEach((n) => knownNotificationIds.current.add(n.id));
          isFirstLoad.current = false;
        } else {
          notifs.forEach((notif) => {
            if (!notif.read && !knownNotificationIds.current.has(notif.id)) {
              triggerLocalNotification(notif.title, notif.message);
            }
            knownNotificationIds.current.add(notif.id);
          });
        }

        setNotifications(notifs);
      } catch (err) {
        console.warn("Nie udało się pobrać powiadomień:", err);
      }

      if (activeShiftId) {
        try {
          const shift = await api.getActiveShift(selectedEvent.id, user.id);
          setActiveShift(shift);
        } catch (err) {
          console.warn("Nie udało się pobrać szczegółów zmiany:", err);
        }
      } else {
        setActiveShift(null);
      }
    };

    loadData();

    dataIntervalRef.current = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
    };
  }, [selectedEvent, activeShiftId, user]);

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

  const handleReactToStaffingRequest = async (requestId: string) => {
    if (!selectedEvent) return;
    setReactLoading(requestId);
    try {
      await api.reactToStaffingRequest(selectedEvent.id, requestId);
      Alert.alert("Sukces", "Zgłoszono gotowość do stacjonowania w wybranym miejscu!");
      // Odświeżenie zapotrzebowań
      const reqs = await api.getStaffingRequests(selectedEvent.id);
      setStaffingRequests(reqs.filter((r) => r.status === "OPEN"));
    } catch (err: any) {
      Alert.alert("Błąd", err.message || "Nie udało się zapisać zgłoszenia");
    } finally {
      setReactLoading(null);
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!selectedEvent) return;
    try {
      await api.markNotificationAsRead(selectedEvent.id, notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn("Błąd oznaczania powiadomienia jako przeczytane:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!selectedEvent) return;
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) => api.markNotificationAsRead(selectedEvent!.id, n.id))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("Błąd oznaczania wszystkich jako przeczytane:", err);
    }
  };

  const getActiveAssignmentName = () => {
    if (activeShift) {
      if (activeShift.zoneId) {
        return `Strefa: ${activeShift.zoneName}`;
      } else if (activeShift.strategicPointId) {
        return `Punkt: ${activeShift.strategicPointName}`;
      }
    }
    if (activeZoneId) {
      const zone = zones.find((z) => z.id === activeZoneId);
      return zone ? `Strefa: ${zone.name}` : "Strefa przypisana";
    }
    return "Cały teren / Brak strefy";
  };

  const hasPermission = (permission: string) => {
    if (user?.role === "COORDINATOR") return true;
    if (!myMemberDetails) return true;
    if (!myMemberDetails.permissions) return true;
    return myMemberDetails.permissions.split(",").includes(permission);
  };

  const [activeTab, setActiveTab] = useState<"shift" | "map" | "chat" | "events">("shift");



  const renderShiftTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Top Navbar */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.roleText}>Rola: {user?.role}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setNotificationsModalVisible(true)}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadNotificationsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.eventLabelCapsule, { marginLeft: 10 }]}>
              <Text style={styles.eventLabelCapsuleText} numberOfLines={1}>
                📍 {selectedEvent?.name}
              </Text>
            </View>
          </View>
        </View>

        {/* GPS Permission Warning */}
        {gpsPermissionGranted === false && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Brak uprawnień do GPS. Aplikacja nie może przesyłać Twojej lokalizacji. Zezwól na dostęp w ustawieniach telefonu.
            </Text>
          </View>
        )}

        {/* Status Panel */}
        {!activeShiftId ? (() => {
          /* STAN: PRZED ROZPOCZĘCIEM PRACY */
          // Determine if user has an assigned zone/point (from staffing reaction or forced assignment)
          const reactedRequest = staffingRequests.find(
            (r) => r.userReacted && r.status === "OPEN"
          );
          const assignedZoneId = reactedRequest?.zoneId || null;
          const assignedZoneName = reactedRequest?.zoneName || null;
          const assignedPointId = reactedRequest?.strategicPointId || null;
          const assignedPointName = reactedRequest?.strategicPointName || null;
          const hasAssignment = !!(assignedZoneId || assignedPointId);

          return (
          <View style={styles.statusPanel}>
            <Text style={styles.panelTitle}>⏱️ Rozpocznij pracę</Text>

            {hasAssignment ? (
              <View>
                <Text style={styles.panelSubtitle}>
                  Zostałeś przydzielony do:
                </Text>
                <View style={[styles.zoneOption, styles.zoneOptionSelected, { marginTop: 8 }]}>
                  <Text style={[styles.zoneOptionText, styles.zoneOptionTextSelected]}>
                    {assignedZoneId
                      ? `📍 Strefa: ${assignedZoneName}`
                      : `🗺️ Punkt: ${assignedPointName}`}
                  </Text>
                </View>
              </View>
            ) : (
              <View>
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
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => {
                if (hasAssignment && assignedZoneId) {
                  setSelectedZoneId(assignedZoneId);
                }
                handleStartShift();
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>ROZPOCZNIJ ZMIANĘ</Text>
              )}
            </TouchableOpacity>
          </View>
          );
        })() : (
          /* STAN: W TRAKCIE PRACY (CHECKED IN) */
          <View style={styles.statusPanel}>
            <View style={styles.activeHeader}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeStatusText}>JESTEŚ NA ZMIANIE</Text>
              </View>
            </View>

            <Text style={styles.activeZoneLabel}>Aktywny przydział:</Text>
            <Text style={styles.activeZoneValue}>{getActiveAssignmentName()}</Text>

            {/* Timer Display */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>CZAS PRACY</Text>
              <Text style={styles.timerValue}>{elapsedTime}</Text>
            </View>

            {/* SOS Emergency Button */}
            {hasPermission("SEND_SOS") && (
              <TouchableOpacity
                style={styles.sosButton}
                onPress={() => setSosModalVisible(true)}
              >
                <Text style={styles.sosButtonText}>🚨 SOS / ZGŁOŚ ALERT</Text>
              </TouchableOpacity>
            )}

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

        {/* Zgłoszenia zapotrzebowania */}
        <View style={styles.staffingContainer}>
          <Text style={styles.sectionTitle}>🙋 Zgłoszenia zapotrzebowania</Text>
          {loadingStaffing ? (
            <ActivityIndicator color="#3B82F6" style={{ marginVertical: 10 }} />
          ) : staffingRequests.length === 0 ? (
            <Text style={styles.noStaffingRequests}>Brak otwartych zapotrzebowań w tym momencie.</Text>
          ) : (
            staffingRequests.map((req) => {
              const targetName = req.zoneName 
                ? `Strefa: ${req.zoneName}` 
                : req.strategicPointName 
                  ? `Punkt: ${req.strategicPointName}` 
                  : "Cały teren";
              
              return (
                <View key={req.id} style={styles.staffingRequestCard}>
                  <View style={styles.staffingRequestHeader}>
                    <Text style={styles.staffingRequestTarget} numberOfLines={1}>
                      📍 {targetName}
                    </Text>
                    <Text style={styles.staffingRequestCount}>
                      Potrzebne: {req.countNeeded} os.
                    </Text>
                  </View>
                  {req.description && (
                    <Text style={styles.staffingRequestDesc}>{req.description}</Text>
                  )}
                  
                  {hasPermission("REACT_STAFFING") ? (
                    req.userReacted ? (
                      <View style={styles.reactedBadge}>
                        <Text style={styles.reactedBadgeText}>✓ Zgłoszono gotowość</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.reactBtn}
                        onPress={() => handleReactToStaffingRequest(req.id)}
                        disabled={reactLoading === req.id}
                      >
                        {reactLoading === req.id ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.reactBtnText}>Zgłoś się</Text>
                        )}
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.noPermissionBadge}>
                      <Text style={styles.noPermissionBadgeText}>Brak uprawnień do reagowania</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  const renderEventsTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Info Header */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : "U"}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.username}</Text>
            <Text style={styles.profileRole}>Rola: {user?.role}</Text>
          </View>
          <TouchableOpacity style={styles.tabSignOutButton} onPress={signOut}>
            <Text style={styles.tabSignOutText}>Wyloguj</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Event Details Card */}
        <View style={styles.eventTabCard}>
          <Text style={styles.eventTabSectionTitle}>📅 Aktywne wydarzenie</Text>
          {selectedEvent ? (
            <View style={styles.eventTabDetails}>
              <Text style={styles.eventTabName}>{selectedEvent.name}</Text>
              <Text style={styles.eventTabDesc}>
                {selectedEvent.description || "Brak opisu wydarzenia."}
              </Text>
              <View style={styles.eventTabMetaRow}>
                <Text style={styles.eventTabMeta}>
                  👤 Właściciel: {selectedEvent.ownerUsername}
                </Text>
                <Text style={styles.eventTabMeta}>
                  👥 Członkowie: {selectedEvent.memberCount}
                </Text>
              </View>
              {activeShiftId && (
                <View style={styles.eventTabWarning}>
                  <Text style={styles.eventTabWarningText}>
                    🔒 Pracujesz na zmianie. Zakończ ją, aby móc zmienić wydarzenie.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noEventText}>Nie wybrano żadnego wydarzenia. Wybierz z listy lub dołącz kodem poniżej.</Text>
          )}
        </View>

        {/* Twoje Wydarzenia (Switch Events) list */}
        <View style={styles.eventListContainer}>
          <Text style={styles.eventTabSectionTitle}>🔄 Twoje wydarzenia ({myEvents.length})</Text>
          {myEvents.length === 0 ? (
            <Text style={styles.noEventsListItemText}>Nie bierzesz udziału w żadnym wydarzeniu.</Text>
          ) : (
            myEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;
              return (
                <TouchableOpacity
                  key={evt.id}
                  style={[
                    styles.eventListItem,
                    isSelected && styles.eventListItemSelected,
                    activeShiftId !== null && styles.eventListItemDisabled,
                  ]}
                  disabled={activeShiftId !== null || isSelected}
                  onPress={async () => {
                    await selectEvent(evt);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.eventListItemText,
                        isSelected && styles.eventListItemTextSelected,
                      ]}
                    >
                      {evt.name}
                    </Text>
                    <Text style={styles.eventListItemSubText}>Status: Aktywne</Text>
                  </View>
                  {isSelected && <Text style={styles.activeCheckmark}>✓</Text>}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Join Event Form */}
        <View style={styles.joinTabCard}>
          <Text style={styles.eventTabSectionTitle}>➕ Dołącz do nowego wydarzenia</Text>
          <Text style={styles.joinTabSubtitle}>
            Wpisz 6-znakowy kod zaproszenia, aby dołączyć do nowego zespołu.
          </Text>

          {joinError && (
            <View style={[styles.errorContainer, { marginBottom: 15 }]}>
              <Text style={styles.errorText}>{joinError}</Text>
            </View>
          )}

          <View style={styles.joinInputRow}>
            <TextInput
              style={styles.joinTextInput}
              placeholder="KOD123"
              placeholderTextColor="#64748B"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={activeShiftId === null && !joiningEvent}
            />
            <TouchableOpacity
              style={[
                styles.joinBtn,
                (activeShiftId !== null || inviteCode.trim().length !== 6 || joiningEvent) && styles.joinBtnDisabled,
              ]}
              onPress={handleJoinNewEvent}
              disabled={activeShiftId !== null || inviteCode.trim().length !== 6 || joiningEvent}
            >
              {joiningEvent ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinBtnText}>Dołącz</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "shift":
        return renderShiftTab();
      case "map":
        return hasPermission("VIEW_MAP") ? <MapScreen /> : renderShiftTab();
      case "chat":
        return hasPermission("WRITE_CHAT") ? <ChatScreen /> : renderShiftTab();
      case "events":
        return renderEventsTab();
      default:
        return renderShiftTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>

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

      {/* NOTIFICATIONS MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notificationsModalVisible}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%", width: "90%" }]}>
            <View style={{ flexDirection: "column", marginBottom: 15, width: "100%", borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#F8FAFC", textAlign: "left" }}>
                🔔 Powiadomienia
              </Text>
              {unreadNotificationsCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={{ marginTop: 6 }}>
                  <Text style={{ color: "#3B82F6", fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>
                    Oznacz wszystkie jako przeczytane
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={{ paddingVertical: 30, alignItems: "center" }}>
                <Text style={{ color: "#94A3B8", fontSize: 14, fontStyle: "italic", textAlign: "center", marginVertical: 20 }}>
                  Brak powiadomień.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1, marginBottom: 15 }}>
                {notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      {
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: "#334155",
                      },
                      item.read ? { backgroundColor: "#1E293B" } : { backgroundColor: "rgba(59, 130, 246, 0.15)", borderColor: "#3B82F6" }
                    ]}
                    onPress={() => handleMarkAsRead(item.id)}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "#F8FAFC", fontWeight: "700", fontSize: 14, flex: 1 }}>
                        {item.type === "CHAT" ? "💬 " : item.type === "ASSIGNMENT" ? "👷 " : item.type === "STAFFING" ? "📦 " : item.type === "SOS" ? "🚨 " : "🔔 "}
                        {item.title}
                      </Text>
                      {!item.read && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" }} />
                      )}
                    </View>
                    <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 5 }}>
                      {item.message || "Brak treści powiadomienia"}
                    </Text>
                    <Text style={{ color: "#475569", fontSize: 11, marginTop: 6, alignSelf: "flex-end" }}>
                      {new Date(item.createdAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnCancel, { width: "100%", marginTop: 0 }]}
              onPress={() => setNotificationsModalVisible(false)}
            >
              <Text style={styles.modalBtnCancelText}>ZAMKNIJ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === "shift" && styles.tabBarItemActive]}
          onPress={() => setActiveTab("shift")}
        >
          <Text style={[styles.tabBarIcon, activeTab === "shift" && styles.tabBarIconActive]}>⏱️</Text>
          <Text style={[styles.tabBarText, activeTab === "shift" && styles.tabBarTextActive]}>Służba</Text>
        </TouchableOpacity>

        {hasPermission("VIEW_MAP") && (
          <TouchableOpacity
            style={[styles.tabBarItem, activeTab === "map" && styles.tabBarItemActive]}
            onPress={() => setActiveTab("map")}
          >
            <Text style={[styles.tabBarIcon, activeTab === "map" && styles.tabBarIconActive]}>🗺️</Text>
            <Text style={[styles.tabBarText, activeTab === "map" && styles.tabBarTextActive]}>Mapa</Text>
          </TouchableOpacity>
        )}

        {hasPermission("WRITE_CHAT") && (
          <TouchableOpacity
            style={[styles.tabBarItem, activeTab === "chat" && styles.tabBarItemActive]}
            onPress={() => setActiveTab("chat")}
          >
            <Text style={[styles.tabBarIcon, activeTab === "chat" && styles.tabBarIconActive]}>💬</Text>
            <Text style={[styles.tabBarText, activeTab === "chat" && styles.tabBarTextActive]}>Czat</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === "events" && styles.tabBarItemActive]}
          onPress={() => setActiveTab("events")}
        >
          <Text style={[styles.tabBarIcon, activeTab === "events" && styles.tabBarIconActive]}>📅</Text>
          <Text style={[styles.tabBarText, activeTab === "events" && styles.tabBarTextActive]}>Wydarzenia</Text>
        </TouchableOpacity>
      </View>
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
  // Tab Navigation styles
  tabContentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#1E293B", // slate 800
    borderTopWidth: 1,
    borderTopColor: "#334155", // slate 700
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 10 : 0,
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabBarItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  tabBarIcon: {
    fontSize: 18,
    color: "#64748B",
    marginBottom: 2,
  },
  tabBarIconActive: {
    fontSize: 20,
    color: "#3B82F6",
  },
  tabBarText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },
  tabBarTextActive: {
    color: "#3B82F6",
  },
  eventLabelCapsule: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    maxWidth: "60%",
  },
  eventLabelCapsuleText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },
  shortcutsContainer: {
    marginTop: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  shortcutBtn: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 12,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  shortcutBtnText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  profileRole: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 2,
  },
  tabSignOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 8,
  },
  tabSignOutText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
  },
  eventTabCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  eventTabSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  eventTabDetails: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  eventTabName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  eventTabDesc: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
    marginBottom: 12,
  },
  eventTabMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
  },
  eventTabMeta: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  eventTabWarning: {
    marginTop: 12,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 6,
    padding: 10,
  },
  eventTabWarningText: {
    color: "#FCA5A5",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "center",
  },
  noEventText: {
    color: "#94A3B8",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  eventListContainer: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  eventListItem: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventListItemSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  eventListItemDisabled: {
    opacity: 0.5,
  },
  eventListItemText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  eventListItemTextSelected: {
    color: "#60A5FA",
  },
  eventListItemSubText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  noEventsListItemText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  joinTabCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  joinTabSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  joinInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  joinTextInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 10,
    height: 46,
    fontWeight: "600",
  },
  joinBtn: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    height: 46,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  joinBtnDisabled: {
    backgroundColor: "#334155",
    opacity: 0.6,
  },
  joinBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  staffingContainer: {
    marginTop: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  noStaffingRequests: {
    color: "#94A3B8",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
  staffingRequestCard: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  staffingRequestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  staffingRequestTarget: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "70%",
  },
  staffingRequestCount: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "700",
  },
  staffingRequestDesc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  reactBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reactBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  reactedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reactedBadgeText: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "700",
  },
  noPermissionBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  noPermissionBadgeText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "600",
  },
  bellButton: {
    padding: 6,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  bellIcon: {
    fontSize: 22,
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: "#0F172A",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
