"use server";

import { BACKEND_URL, getAuthHeaders } from "./base";

export interface ChatMessageResponse {
  id: string;
  eventId: string;
  senderId: string;
  senderUsername: string;
  recipientId: string | null;
  recipientUsername: string | null;
  channel: string | null;
  content: string;
  createdAt: string;
}

export async function getGeneralChat(
  eventId: string
): Promise<{ success: boolean; data?: ChatMessageResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/chat?channel=GENERAL`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Nie udało się pobrać historii chatu ogólnego" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Błąd połączenia z serwerem" };
  }
}

export async function getCoordinatorThread(
  eventId: string,
  volunteerId: string
): Promise<{ success: boolean; data?: ChatMessageResponse[]; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/events/${eventId}/chat/coordinators/${volunteerId}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Nie udało się pobrać historii wątku" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Błąd połączenia z serwerem" };
  }
}

export async function getProfile(): Promise<{ success: boolean; data?: { id: string; username: string; role: string }; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/users/me`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Nie udało się pobrać profilu" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Błąd połączenia z serwerem" };
  }
}

