import { BASE_URL, getHeaders, ShiftResponse } from "./base";

export const shiftApi = {
  async checkIn(userId: string, eventId: string, zoneId?: string): Promise<ShiftResponse> {
    const headers = await getHeaders();
    let url = `${BASE_URL}/shifts/check-in?userId=${userId}&eventId=${eventId}`;
    if (zoneId) {
      url += `&zoneId=${zoneId}`;
    }
    const res = await fetch(url, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się rozpocząć zmiany");
    }
    return res.json();
  },

  async checkOut(shiftId: string): Promise<ShiftResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/shifts/${shiftId}/check-out`, {
      method: "POST",
      headers,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się zakończyć zmiany");
    }
    return res.json();
  },
};
