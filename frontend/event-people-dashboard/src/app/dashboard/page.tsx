import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "../actions/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt-token");

  // Jeśli brak tokenu JWT w ciastkach, powrót na stronę logowania
  if (!token) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-panel-border">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Dashboard</h1>
          <p className="text-text-muted text-sm">Zalogowano pomyślnie</p>
        </div>
        <form action={logout}>
          <button type="submit" className="px-4 py-2 bg-panel-bg border border-panel-border text-text-main rounded hover:bg-dashboard-bg text-sm font-medium">
            Wyloguj
          </button>
        </form>
      </header>

      <div className="dashboard-panel p-6">
        <h2 className="text-lg font-medium text-text-main mb-4">Witaj w Event Manager</h2>
        <p className="text-text-muted text-sm">
          To jest panel sterowania. W kolejnych krokach zintegrujemy tutaj mapę i statystyki.
        </p>
        <div className="mt-6 p-4 bg-dashboard-bg border border-panel-border rounded overflow-hidden">
          <p className="text-xs text-text-muted break-all">
            Twój token: <br/> {token.value}
          </p>
        </div>
      </div>
    </div>
  );
}
