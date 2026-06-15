"use client";

import { useState, useEffect } from "react";
import { EventResponse, EventStatsResponse } from "../../types/event";
import EventSelector from "./EventSelector";
import StatsCards from "./StatsCards";
import DashboardTabs from "./DashboardTabs";
import { getEventStats } from "../actions/event";
import { logout } from "../actions/auth";

interface DashboardClientProps {
  initialEvents: EventResponse[];
  token: string;
}

export default function DashboardClient({ initialEvents, token }: DashboardClientProps) {
  const [events, setEvents] = useState<EventResponse[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialEvents.length > 0 ? initialEvents[0].id : null
  );
  const [stats, setStats] = useState<EventStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchStats(selectedEventId);
    } else {
      setStats(null);
    }
  }, [selectedEventId]);

  async function fetchStats(eventId: string) {
    setLoadingStats(true);
    const res = await getEventStats(eventId);
    if (res.success && res.data) {
      setStats(res.data);
    }
    setLoadingStats(false);
  }

  function handleEventCreated(newEvent: EventResponse) {
    setEvents((prev) => [...prev, newEvent]);
    setSelectedEventId(newEvent.id);
  }

  function handleRefreshStats() {
    if (selectedEventId) {
      fetchStats(selectedEventId);
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-panel-border gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Panel Koordynatora</h1>
          <p className="text-text-muted text-sm mt-0.5">Zarządzanie strefami, bezpieczeństwem i zespołem.</p>
        </div>

        <div className="flex items-center space-x-4 w-full md:w-auto md:justify-end">
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            onSelect={setSelectedEventId}
            onEventCreated={handleEventCreated}
          />
          
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 bg-panel-bg border border-panel-border text-text-main rounded-md hover:bg-dashboard-bg hover:text-danger-red transition-all text-sm font-semibold mt-5"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </header>

      {/* Stats Cards Section */}
      {selectedEventId ? (
        <div className="space-y-6">
          <StatsCards stats={stats} />
          
          {/* Dashboard Main Tabs Panel */}
          <DashboardTabs
            eventId={selectedEventId}
            token={token}
            onRefreshStats={handleRefreshStats}
          />
        </div>
      ) : (
        <div className="dashboard-panel p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto mt-12">
          <div className="text-5xl">🗓️</div>
          <h2 className="text-lg font-semibold text-text-main">Brak aktywnych wydarzeń</h2>
          <p className="text-sm text-text-muted">
            Utwórz swoje pierwsze wydarzenie klikając przycisk <strong className="text-text-main font-semibold">"+ Nowe Wydarzenie"</strong> w prawym górnym rogu ekranu, aby rozpocząć monitorowanie w czasie rzeczywistym.
          </p>
        </div>
      )}
    </div>
  );
}
