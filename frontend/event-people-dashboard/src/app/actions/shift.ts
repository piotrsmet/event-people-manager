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
