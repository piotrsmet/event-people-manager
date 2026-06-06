"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = "http://localhost:8080/api/v1/auth";

export async function login(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      return { error: "Invalid credentials" };
    }

    const data = await res.json();
    const token = data.token; // AuthResponse ma pole "token"

    if (token) {
      const cookieStore = await cookies();
      cookieStore.set("jwt-token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
      return { success: true };
    } else {
      return { error: "Token missing in response" };
    }
  } catch (err) {
    return { error: "Failed to connect to the server" };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("jwt-token");
  redirect("/");
}
