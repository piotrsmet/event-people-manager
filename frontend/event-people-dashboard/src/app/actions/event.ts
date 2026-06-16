"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { EventResponse, EventStatsResponse, EventMemberResponse } from "../../types/event";

export async function getEvents(): Promise<{ success: boolean; data?: EventResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch events from server" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function createEvent(
  name: string,
  description: string,
  startDate?: string,
  endDate?: string,
  outdoor?: boolean,
  boundaryGeoJson?: string,
  buildingPlanBase64?: string
): Promise<{ success: boolean; data?: EventResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, description, startDate, endDate, outdoor, boundaryGeoJson, buildingPlanBase64 }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to create event" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function updateEvent(
  eventId: string,
  updates: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    outdoor?: boolean;
    boundaryGeoJson?: string;
    buildingPlanBase64?: string;
    customRoles?: string;
    customTags?: string;
  }
): Promise<{ success: boolean; data?: EventResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to update event" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function getEventStats(eventId: string): Promise<{ success: boolean; data?: EventStatsResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/stats`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch stats" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function getEventMembers(eventId: string): Promise<{ success: boolean; data?: EventMemberResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/members`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch members" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function updateMemberRole(
  eventId: string,
  userId: string,
  role: 'COORDINATOR' | 'SECURITY' | 'VOLUNTEER'
): Promise<{ success: boolean; data?: EventMemberResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/members/${userId}/role?role=${role}`, {
      method: "PUT",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to update member role" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function removeMember(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/members/${userId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to remove member" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
