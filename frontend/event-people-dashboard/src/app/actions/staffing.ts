"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { StaffingRequestResponse, StaffingResponseResponse } from "../../types/staffing";

export async function getStaffingRequests(
  eventId: string
): Promise<{ success: boolean; data?: StaffingRequestResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/staffing-requests`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch staffing requests" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function createStaffingRequest(
  eventId: string,
  data: {
    zoneId: string | null;
    strategicPointId: string | null;
    countNeeded: number;
    description: string;
  }
): Promise<{ success: boolean; data?: StaffingRequestResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/staffing-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to create staffing request" };
    }

    const resData = await res.json();
    return { success: true, data: resData };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function getStaffingResponses(
  eventId: string,
  requestId: string
): Promise<{ success: boolean; data?: StaffingResponseResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/staffing-requests/${requestId}/responses`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch staffing responses" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function updateStaffingRequestStatus(
  eventId: string,
  requestId: string,
  status: string
): Promise<{ success: boolean; data?: StaffingRequestResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/staffing-requests/${requestId}/status?status=${status}`, {
      method: "PUT",
      headers,
    });

    if (!res.ok) {
      return { success: false, error: "Failed to update staffing request status" };
    }

    const resData = await res.json();
    return { success: true, data: resData };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
