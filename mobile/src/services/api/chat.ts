import { BASE_URL, getHeaders } from "./base";

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

export const chatApi = {
  async getGeneralChat(eventId: string): Promise<ChatMessageResponse[]> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/chat?channel=GENERAL`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to load general chat history");
    }
    return res.json();
  },

  async getCoordinatorChat(eventId: string): Promise<ChatMessageResponse[]> {
    const res = await fetch(`${BASE_URL}/events/${eventId}/chat/coordinators`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to load coordinator thread history");
    }
    return res.json();
  },
};
