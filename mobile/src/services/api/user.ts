import { BASE_URL, getHeaders, UserResponse } from "./base";

export const userApi = {
  async getCurrentUser(): Promise<UserResponse> {
    const headers = await getHeaders();
    const res = await fetch(`${BASE_URL}/users/me`, { headers });
    if (!res.ok) throw new Error("Nie udało się pobrać danych użytkownika");
    return res.json();
  },
};
