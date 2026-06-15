"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { PaginatedIncidents, IncidentResponse } from "../../types/incident";

export async function getIncidents(
  eventId: string,
  page = 0,
  size = 10
): Promise<{ success: boolean; data?: PaginatedIncidents; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/incidents?page=${page}&size=${size}&sort=createdAt,desc`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch incidents" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function resolveIncident(incidentId: string): Promise<{ success: boolean; data?: IncidentResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/incidents/${incidentId}/resolve`, {
      method: "POST",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to resolve incident" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
