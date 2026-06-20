"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";
import { CustomRoleResponse } from "../../types/event";

export async function getCustomRoles(
  eventId: string
): Promise<{ success: boolean; data?: CustomRoleResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/custom-roles`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to fetch custom roles" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function createCustomRole(
  eventId: string,
  name: string,
  permissions: string
): Promise<{ success: boolean; data?: CustomRoleResponse; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/custom-roles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, permissions }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.message || "Failed to create custom role" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function deleteCustomRole(
  eventId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/custom-roles/${roleId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      return { success: false, error: "Failed to delete custom role" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}

export async function updateMemberCustomRole(
  eventId: string,
  userId: string,
  customRoleId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const url = new URL(`${BACKEND_URL}/events/${eventId}/members/${userId}/custom-role`);
    if (customRoleId) {
      url.searchParams.append("customRoleId", customRoleId);
    }
    const res = await fetch(url.toString(), {
      method: "PUT",
      headers,
    });

    if (!res.ok) {
      return { success: false, error: "Failed to update member custom role" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Connection error" };
  }
}
