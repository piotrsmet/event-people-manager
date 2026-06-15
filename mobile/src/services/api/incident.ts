import { BASE_URL, getHeaders, IncidentResponse } from "./base";

export const incidentApi = {
  async reportIncident(
    reporterId: string,
    eventId: string,
    zoneId: string | null,
    type: "MEDICAL" | "SECURITY" | "LOGISTICS" | "OTHER",
    description: string,
    locationLat: number,
    locationLng: number
  ): Promise<IncidentResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/incidents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reporterId,
        eventId,
        zoneId,
        type,
        description,
        locationLat,
        locationLng,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || "Nie udało się zgłosić incydentu SOS");
    }
    return res.json();
  },
};
