import { BASE_URL, getHeaders } from "./base";

export interface StaffingRequestResponse {
  id: string;
  eventId: string;
  zoneId: string | null;
  zoneName: string | null;
  strategicPointId: string | null;
  strategicPointName: string | null;
  countNeeded: number;
  description: string | null;
  status: string;
  userReacted: boolean;
  createdAt: string;
}

export interface StaffingResponseResponse {
  id: string;
  staffingRequestId: string;
  userId: string;
  username: string;
  createdAt: string;
}

export const staffingApi = {
  async getStaffingRequests(eventId: string): Promise<StaffingRequestResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/staffing-requests`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać zapotrzebowań");
    return res.json();
  },

  async reactToStaffingRequest(eventId: string, requestId: string): Promise<StaffingResponseResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/staffing-requests/${requestId}/react`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Nie udało się zgłosić do zapotrzebowania");
    }
    return res.json();
  },
};
