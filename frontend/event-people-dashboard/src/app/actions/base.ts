import { cookies } from "next/headers";

export const BACKEND_URL = "http://localhost:8080/api/v1";

export async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt-token")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
