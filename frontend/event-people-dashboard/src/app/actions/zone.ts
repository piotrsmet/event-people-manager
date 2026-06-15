"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { ZoneResponse, CreateZoneRequest } from "../../types/zone";

export async function getZones(eventId: string): Promise<{ success: boolean; data?: ZoneResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/zones`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch zones" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function createZone(
  eventId: string,
  data: CreateZoneRequest
): Promise<{ success: boolean; data?: ZoneResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/zones`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to create zone" };
    }

    const zone = await res.json();
    return { success: true, data: zone };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function updateZone(
  zoneId: string,
  data: CreateZoneRequest
): Promise<{ success: boolean; data?: ZoneResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/zones/${zoneId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to update zone" };
    }

    const zone = await res.json();
    return { success: true, data: zone };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function deleteZone(zoneId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/zones/${zoneId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to delete zone" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
