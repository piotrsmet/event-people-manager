"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { ShiftResponse } from "../../types/shift";

export async function getActiveShifts(
  eventId: string
): Promise<{ success: boolean; data?: ShiftResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/shifts/active`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch active shifts" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function assignShift(
  eventId: string,
  shiftId: string,
  zoneId: string | null,
  strategicPointId: string | null
): Promise<{ success: boolean; data?: ShiftResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${BACKEND_URL}/events/${eventId}/shifts/${shiftId}/assign`);
    if (zoneId) {
      url.searchParams.append("zoneId", zoneId);
    }
    if (strategicPointId) {
      url.searchParams.append("strategicPointId", strategicPointId);
    }

    const res = await fetch(url.toString(), {
      method: "PUT",
      headers,
    });

    if (!res.ok) {
      return { success: false, error: "Failed to assign shift" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
