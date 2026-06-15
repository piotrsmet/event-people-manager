import { BASE_URL, getHeaders, ZoneResponse } from "./base";

export const zoneApi = {
  async getZones(eventId: string): Promise<ZoneResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/zones`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać stref");
    return res.json();
  },
};
