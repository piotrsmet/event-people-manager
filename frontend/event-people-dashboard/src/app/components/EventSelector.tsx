"use client";

import { useState } from "react";
import { EventResponse } from "../../types/event";
import { createEvent } from "../actions/event";

interface EventSelectorProps {
  events: EventResponse[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
  onEventCreated: (newEvent: EventResponse) => void;
}

export default function EventSelector({
  events,
  selectedEventId,
  onSelect,
  onEventCreated,
}: EventSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateEvent(formData: FormData) {
    setIsLoading(true);
    setError(null);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    // Server Action oczekuje dat jako ISO strings lub undefined
    const startIso = startDate ? new Date(startDate).toISOString() : undefined;
    const endIso = endDate ? new Date(endDate).toISOString() : undefined;

    const res = await createEvent(name, description, startIso, endIso);

    if (res.success && res.data) {
      onEventCreated(res.data);
      setIsModalOpen(false);
    } else {
      setError(res.error || "Nie udało się utworzyć wydarzenia");
    }
    setIsLoading(false);
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-text-muted mb-1">
          Aktywne Wydarzenie
        </label>
        <select
          value={selectedEventId || ""}
          onChange={(e) => onSelect(e.target.value)}
          className="px-3 py-2 bg-panel-bg border border-panel-border rounded text-text-main focus:outline-none focus:border-primary-blue text-sm font-medium"
        >
          <option value="" disabled>
            -- Wybierz wydarzenie --
          </option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.name} ({evt.status})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-primary py-2 px-3 mt-5 flex items-center space-x-1"
      >
        <span>+</span>
        <span className="text-xs">Nowe Wydarzenie</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="dashboard-panel max-w-md w-full p-6 space-y-6 bg-panel-bg border border-panel-border rounded-lg shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-panel-border">
              <h3 className="text-lg font-medium text-text-main">
                Nowe Wydarzenie
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-main text-sm"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-danger-red/10 border border-danger-red/50 text-danger-red rounded text-sm text-center">
                {error}
              </div>
            )}

            <form action={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted">
                  Nazwa wydarzenia
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main text-sm"
                  placeholder="np. Open'er Festival 2026"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-muted">
                  Opis
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main text-sm"
                  placeholder="Krótki opis wydarzenia..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    Data rozpoczęcia
                  </label>
                  <input
                    name="startDate"
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">
                    Data zakończenia
                  </label>
                  <input
                    name="endDate"
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded focus:outline-none focus:border-primary-blue text-text-main text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-panel-border text-text-muted rounded hover:text-text-main text-sm animate-pulse-none"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? "Tworzenie..." : "Utwórz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
