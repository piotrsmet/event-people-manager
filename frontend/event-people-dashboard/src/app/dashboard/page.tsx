import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEvents } from "../actions/event";
import DashboardClient from "../components/DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt-token");

  // Jeśli brak tokenu JWT w ciastkach, powrót na stronę logowania
  if (!token) {
    redirect("/");
  }

  // Pobieramy wstępne wydarzenia na serwerze
  const res = await getEvents();
  const initialEvents = res.success && res.data ? res.data : [];

  return <DashboardClient initialEvents={initialEvents} token={token.value} />;
}
