import { BASE_URL, getHeaders, EventResponse } from "./base";

export const eventApi = {
  async getMyEvents(): Promise<EventResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać listy wydarzeń");
    return res.json();
  },

  async joinEvent(code: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/invites/join`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Kod zaproszenia jest nieprawidłowy lub wygasł");
    }
    return res.json();
  },

  async getMemberDetails(eventId: string): Promise<any> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/members/me`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać danych członkostwa");
    return res.json();
  },
};
