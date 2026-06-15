"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { InviteTokenResponse } from "../../types/invite";

export async function getInvites(eventId: string): Promise<{ success: boolean; data?: InviteTokenResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/invites`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch invites" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function generateInvite(
  eventId: string,
  assignedRole: 'COORDINATOR' | 'SECURITY' | 'VOLUNTEER',
  maxUses?: number | null,
  expiresAt?: string | null
): Promise<{ success: boolean; data?: InviteTokenResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/invites`, {
      method: "POST",
      headers,
      body: JSON.stringify({ assignedRole, maxUses, expiresAt }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to generate invite token" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/invites/${inviteId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to revoke invite" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
