"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { StrategicPointResponse, CreateStrategicPointRequest } from "../../types/strategicPoint";

export async function getStrategicPoints(
  eventId: string
): Promise<{ success: boolean; data?: StrategicPointResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/strategic-points`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch strategic points" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function createStrategicPoint(
  eventId: string,
  request: CreateStrategicPointRequest
): Promise<{ success: boolean; data?: StrategicPointResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/strategic-points`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to create strategic point" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function deleteStrategicPoint(
  pointId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/strategic-points/${pointId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to delete strategic point" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
