import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Na emulatorze Android localhost to 10.0.2.2. Na iOS/web to localhost.
// W przypadku testów na fizycznym telefonie zmień ten adres na IP swojego komputera w sieci lokalnej (np. "http://192.168.1.100:8080/api/v1").
export const BASE_URL = Platform.select({
  android: "http://10.0.2.2:8080/api/v1",
  default: "http://localhost:8080/api/v1",
});

async function getHeaders() {
  const token = await SecureStore.getItemAsync("user_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface UserResponse {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export interface EventResponse {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  capacity?: number;
}

export interface ShiftResponse {
  id: string;
  userId: string;
  eventId: string;
  zoneId?: string;
  startTime: string;
  endTime?: string;
  status: string;
}

export interface IncidentResponse {
  id: string;
  reporterId: string;
  eventId: string;
  zoneId?: string;
  type: string;
  description: string;
  status: string;
  locationLat: number;
  locationLng: number;
  createdAt: string;
}

export const api = {
  async login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.message || "Błąd logowania" };
      }

      const data = await res.json();
      return { success: true, token: data.token };
    } catch (err) {
      return { success: false, error: "Błąd połączenia z serwerem" };
    }
  },

  async getCurrentUser(): Promise<UserResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/users/me`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać danych użytkownika");
    return res.json();
  },

  async getMyEvents(): Promise<EventResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać listy wydarzeń");
    return res.json();
  },

  async joinEvent(code: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/invites/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Kod zaproszenia jest nieprawidłowy lub wygasł");
    }
    return res.json();
  },

  async getZones(eventId: string): Promise<ZoneResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/zones`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać stref");
    return res.json();
  },

  async checkIn(userId: string, eventId: string, zoneId?: string): Promise<ShiftResponse> {
    const headers = await getHeaders();
    let url = `${BASE_URL}/shifts/check-in?userId=${userId}&eventId=${eventId}`;
    if (zoneId) {
      url += `&zoneId=${zoneId}`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się rozpocząć zmiany");
    }
    return res.json();
  },

  async checkOut(shiftId: string): Promise<ShiftResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/shifts/${shiftId}/check-out`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się zakończyć zmiany");
    }
    return res.json();
  },

  async sendLocation(userId: string, shiftId: string | null, latitude: number, longitude: number): Promise<void> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/locations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId, shiftId, latitude, longitude }),
    });
    if (!res.ok) {
      throw new Error("Nie udało się wysłać pozycji GPS");
    }
  },

  async reportIncident(
    reporterId: string,
    eventId: string,
    zoneId: string | null,
    type: "MEDICAL" | "SECURITY" | "LOGISTICS" | "OTHER",
    description: string,
    locationLat: number,
    locationLng: number
  ): Promise<IncidentResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/incidents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reporterId,
        eventId,
        zoneId,
        type,
        description,
        locationLat,
        locationLng,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się zgłosić incydentu SOS");
    }
    return res.json();
  },
};
