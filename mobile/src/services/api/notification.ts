import { BASE_URL, getHeaders } from "./base";

export interface NotificationResponse {
  id: string;
  userId: string | null;
  eventId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export const notificationApi = {
  async getMyNotifications(eventId: string): Promise<NotificationResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/notifications`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać powiadomień");
    return res.json();
  },

  async markNotificationAsRead(eventId: string, notificationId: string): Promise<NotificationResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/notifications/${notificationId}/read`, {
      method: "PUT",
      headers,
    });
    if (!res.ok) throw new Error("Nie udało się oznaczyć powiadomienia jako przeczytane");
    return res.json();
  },
};
