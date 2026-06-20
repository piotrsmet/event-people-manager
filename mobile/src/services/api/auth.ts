import { BASE_URL } from "./base";

export const authApi = {
  async login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.message || "Błąd logowania" };
      }

      const data = await res.json();
      return { success: true, token: data.token };
    } catch (err) {
      return { success: false, error: "Błąd połączenia z serwerem" };
    }
  },

  async register(
    username: string,
    password: string,
    role: "VOLUNTEER" | "SECURITY" | "COORDINATOR" = "VOLUNTEER"
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify({ username, password, role }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.message || "Błąd rejestracji" };
      }

      const data = await res.json();
      return { success: true, token: data.token };
    } catch (err) {
      return { success: false, error: "Błąd połączenia z serwerem" };
    }
  },
};
