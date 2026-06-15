import { BASE_URL, getHeaders } from "./base";

export const locationApi = {
  async sendLocation(userId: string, shiftId: string | null, latitude: number, longitude: number): Promise<void> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/locations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userId, shiftId, latitude, longitude }),
    });
    if (!res.ok) {
      throw new Error("Nie udało się wysłać pozycji GPS");
    }
  },
};
