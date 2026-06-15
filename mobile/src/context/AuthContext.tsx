import React, { createContext, useState, useEffect, useContext } from "react";
import * as SecureStore from "expo-secure-store";
import { api, UserResponse, EventResponse } from "../services/api";

interface AuthContextType {
  token: string | null;
  user: UserResponse | null;
  myEvents: EventResponse[];
  selectedEvent: EventResponse | null;
  activeShiftId: string | null;
  activeZoneId: string | null;
  activeShiftStartTime: string | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  loadEvents: () => Promise<void>;
  selectEvent: (event: EventResponse | null) => Promise<void>;
  startShift: (zoneId?: string) => Promise<void>;
  endShift: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [myEvents, setMyEvents] = useState<EventResponse[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [activeShiftStartTime, setActiveShiftStartTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync("user_token");
      const storedShiftId = await SecureStore.getItemAsync("active_shift_id");
      const storedZoneId = await SecureStore.getItemAsync("active_zone_id");
      const storedEventId = await SecureStore.getItemAsync("selected_event_id");
      const storedShiftStartTime = await SecureStore.getItemAsync("active_shift_start_time");

      if (storedToken) {
        setToken(storedToken);
        
        // Pobierz dane użytkownika i wydarzenia
        const userProfile = await api.getCurrentUser();
        setUser(userProfile);

        const events = await api.getMyEvents();
        setMyEvents(events);

        if (storedEventId) {
          const matchedEvent = events.find(e => e.id === storedEventId);
          if (matchedEvent) {
            setSelectedEvent(matchedEvent);
          } else if (events.length > 0) {
            setSelectedEvent(events[0]);
          }
        } else if (events.length > 0) {
          setSelectedEvent(events[0]);
        }

        if (storedShiftId) {
          setActiveShiftId(storedShiftId);
        }
        if (storedZoneId) {
          setActiveZoneId(storedZoneId);
        }
        if (storedShiftStartTime) {
          setActiveShiftStartTime(storedShiftStartTime);
        }
      }
    } catch (e) {
      console.warn("Błąd podczas odtwarzania sesji:", e);
      // W razie uszkodzonego tokena, wyloguj
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = async () => {
    setToken(null);
    setUser(null);
    setMyEvents([]);
    setSelectedEvent(null);
    setActiveShiftId(null);
    setActiveZoneId(null);
    setActiveShiftStartTime(null);
    await SecureStore.deleteItemAsync("user_token");
    await SecureStore.deleteItemAsync("active_shift_id");
    await SecureStore.deleteItemAsync("active_zone_id");
    await SecureStore.deleteItemAsync("selected_event_id");
    await SecureStore.deleteItemAsync("active_shift_start_time");
  };

  const signIn = async (username: string, password: string) => {
    setIsLoading(true);
    const result = await api.login(username, password);
    if (!result.success || !result.token) {
      setIsLoading(false);
      return { success: false, error: result.error };
    }

    try {
      await SecureStore.setItemAsync("user_token", result.token);
      setToken(result.token);

      const userProfile = await api.getCurrentUser();
      setUser(userProfile);

      const events = await api.getMyEvents();
      setMyEvents(events);

      if (events.length > 0) {
        setSelectedEvent(events[0]);
        await SecureStore.setItemAsync("selected_event_id", events[0].id);
      }

      setIsLoading(false);
      return { success: true };
    } catch (err) {
      await clearSession();
      setIsLoading(false);
      return { success: false, error: "Nie udało się autoryzować sesji" };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    // Jeśli na zmianie, spróbuj zamknąć zmianę przed wylogowaniem
    if (activeShiftId) {
      try {
        await api.checkOut(activeShiftId);
      } catch (e) {
        console.warn("Nie udało się zamknąć zmiany przy wylogowaniu:", e);
      }
    }
    await clearSession();
    setIsLoading(false);
  };

  const loadEvents = async () => {
    try {
      const events = await api.getMyEvents();
      setMyEvents(events);
      // Jeśli nie ma wybranego wydarzenia lub wybrane wydarzenie już nie istnieje, wybierz pierwsze z nowej listy
      if (events.length > 0) {
        if (!selectedEvent || !events.some(e => e.id === selectedEvent.id)) {
          setSelectedEvent(events[0]);
          await SecureStore.setItemAsync("selected_event_id", events[0].id);
        }
      } else {
        setSelectedEvent(null);
        await SecureStore.deleteItemAsync("selected_event_id");
      }
    } catch (e) {
      console.error("Błąd ładowania wydarzeń:", e);
    }
  };

  const selectEvent = async (event: EventResponse | null) => {
    setSelectedEvent(event);
    if (event) {
      await SecureStore.setItemAsync("selected_event_id", event.id);
    } else {
      await SecureStore.deleteItemAsync("selected_event_id");
    }
  };

  const startShift = async (zoneId?: string) => {
    if (!user || !selectedEvent) return;
    const shift = await api.checkIn(user.id, selectedEvent.id, zoneId);
    setActiveShiftId(shift.id);
    setActiveShiftStartTime(shift.startTime);
    await SecureStore.setItemAsync("active_shift_id", shift.id);
    await SecureStore.setItemAsync("active_shift_start_time", shift.startTime);
    if (zoneId) {
      setActiveZoneId(zoneId);
      await SecureStore.setItemAsync("active_zone_id", zoneId);
    }
  };

  const endShift = async () => {
    if (!activeShiftId) return;
    await api.checkOut(activeShiftId);
    setActiveShiftId(null);
    setActiveZoneId(null);
    setActiveShiftStartTime(null);
    await SecureStore.deleteItemAsync("active_shift_id");
    await SecureStore.deleteItemAsync("active_zone_id");
    await SecureStore.deleteItemAsync("active_shift_start_time");
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const userProfile = await api.getCurrentUser();
      setUser(userProfile);
    } catch (e) {
      console.error("Błąd odświeżania użytkownika:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        myEvents,
        selectedEvent,
        activeShiftId,
        activeZoneId,
        activeShiftStartTime,
        isLoading,
        signIn,
        signOut,
        loadEvents,
        selectEvent,
        startShift,
        endShift,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth musi być użyty wewnątrz AuthProvider");
  }
  return context;
};
