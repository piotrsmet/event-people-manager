import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Na emulatorze Android localhost to 10.0.2.2. Na iOS/web to localhost.
// W przypadku testów na fizycznym telefonie zmień ten adres na IP swojego komputera w sieci lokalnej (np. "http://192.168.1.100:8080/api/v1").
export const BASE_URL = Platform.select({
  android: "https://brown-mails-press.loca.lt/api/v1",
  default: "https://brown-mails-press.loca.lt/api/v1",
});

export async function getHeaders() {
  const token = await SecureStore.getItemAsync("user_token");
  return {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true",
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
  ownerUsername: string;
  status: string;
  memberCount: number;
  outdoor: boolean;
  boundaryGeoJson?: string;
  buildingPlanBase64?: string;
  customRoles?: string;
  customTags?: string;
  createdAt: string;
}

export interface ZoneResponse {
  id: string;
  name: string;
  description: string;
  capacity?: number;
  eventId: string;
  createdAt: string;
  boundaryGeoJson?: string;
  color?: string;
  allowedRoles?: string;
  accessTags?: string;
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
