import { BASE_URL, getHeaders } from "./base";

export interface StrategicPointResponse {
  id: string;
  name: string;
  type: "MEDICAL" | "SECURITY" | "ENTRANCE" | "STAGE" | "INFO" | "OTHER";
  latitude?: number;
  longitude?: number;
  xRatio?: number;
  yRatio?: number;
  eventId: string;
}

export const strategicPointApi = {
  async getStrategicPoints(eventId: string): Promise<StrategicPointResponse[]> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/events/${eventId}/strategic-points`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać punktów strategicznych");
    return res.json();
  },
};
