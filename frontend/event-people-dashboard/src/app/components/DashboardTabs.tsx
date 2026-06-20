"use client";

import { useState, useEffect } from "react";
import LiveMapWidget from "./LiveMapWidget";
import { getZones, createZone, deleteZone } from "../actions/zone";
import { getEventMembers, updateMemberRole, removeMember } from "../actions/event";
import { getInvites, generateInvite, revokeInvite } from "../actions/invite";
import { getIncidents, resolveIncident } from "../actions/incident";
import { ZoneResponse } from "../../types/zone";
import { EventMemberResponse, EventResponse } from "../../types/event";
import { InviteTokenResponse } from "../../types/invite";
import { IncidentResponse } from "../../types/incident";
import TerritoryManager from "./TerritoryManager";
import ChatManager from "./ChatManager";

interface DashboardTabsProps {
  eventId: string;
  token: string;
  onRefreshStats: () => void;
  activeEvent: EventResponse | null;
  onUpdateEvent: (updatedEvent: EventResponse) => void;
}

type TabType = "map" | "team" | "invites" | "incidents" | "territory" | "chat";

export default function DashboardTabs({ eventId, token, onRefreshStats, activeEvent, onUpdateEvent }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for data
  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [members, setMembers] = useState<EventMemberResponse[]>([]);
  const [invites, setInvites] = useState<InviteTokenResponse[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);

  // Badge — open incident count
  const [openIncidentCount, setOpenIncidentCount] = useState(0);

  // Form states

  const [newInviteRole, setNewInviteRole] = useState<"VOLUNTEER" | "SECURITY" | "COORDINATOR">("VOLUNTEER");
  const [newInviteMaxUses, setNewInviteMaxUses] = useState("");
  const [newInviteExpiry, setNewInviteExpiry] = useState("");

  // Zawsze ładujemy członków, aby poprawnie filtrować mapę
  useEffect(() => {
    async function loadMembers() {
      const res = await getEventMembers(eventId);
      if (res.success && res.data) {
        setMembers(res.data);
      }
    }
    loadMembers();
  }, [eventId]);

  // Global polling for open incident count badge (runs regardless of active tab)
  useEffect(() => {
    async function pollIncidentCount() {
      try {
        const res = await getIncidents(eventId, 0, 100);
        if (res.success && res.data) {
          const openCount = res.data.content.filter(
            (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
          ).length;
          setOpenIncidentCount(openCount);
        }
      } catch (_) { /* ignore */ }
    }
    pollIncidentCount();
    const interval = setInterval(pollIncidentCount, 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Auto-polling when on incidents tab (refresh every 10s)
  useEffect(() => {
    if (activeTab !== "incidents") return;
    const interval = setInterval(async () => {
      try {
        const res = await getIncidents(eventId, 0, 50);
        if (res.success && res.data) {
          setIncidents(res.data.content);
          const openCount = res.data.content.filter(
            (i) => i.status === "OPEN" || i.status === "IN_PROGRESS"
          ).length;
          setOpenIncidentCount(openCount);
        }
      } catch (_) { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [eventId, activeTab]);

  useEffect(() => {
    fetchTabData();
  }, [eventId, activeTab]);

  async function fetchTabData() {
    if (activeTab === "map") return;
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "territory") {
        const res = await getZones(eventId);
        if (res.success && res.data) setZones(res.data);
        else setError(res.error || "Błąd pobierania stref");
      } else if (activeTab === "team") {
        const res = await getEventMembers(eventId);
        if (res.success && res.data) setMembers(res.data);
        else setError(res.error || "Błąd pobierania członków");
      } else if (activeTab === "invites") {
        const res = await getInvites(eventId);
        if (res.success && res.data) setInvites(res.data);
        else setError(res.error || "Błąd pobierania zaproszeń");
      } else if (activeTab === "incidents") {
        const res = await getIncidents(eventId, 0, 50);
        if (res.success && res.data) setIncidents(res.data.content);
        else setError(res.error || "Błąd pobierania incydentów");
      }
    } catch (err) {
      setError("Wystąpił nieoczekiwany błąd");
    } finally {
      setLoading(false);
    }
  }

  // Team actions
  async function handleChangeRole(userId: string, newRole: "COORDINATOR" | "SECURITY" | "VOLUNTEER") {
    setActionLoading(userId);
    const res = await updateMemberRole(eventId, userId, newRole);
    if (res.success && res.data) {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data! : m)));
    } else {
      setError(res.error || "Błąd zmiany roli");
    }
    setActionLoading(null);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Czy na pewno chcesz usunąć tego członka z wydarzenia?")) return;
    setActionLoading(userId);
    const res = await removeMember(eventId, userId);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      onRefreshStats();
    } else {
      setError(res.error || "Błąd usuwania członka");
    }
    setActionLoading(null);
  }

  // Invite actions
  async function handleGenerateInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const maxUsesNum = newInviteMaxUses ? parseInt(newInviteMaxUses) : null;
    const expiresIso = newInviteExpiry ? new Date(newInviteExpiry).toISOString() : null;

    const res = await generateInvite(eventId, newInviteRole, maxUsesNum, expiresIso);
    if (res.success && res.data) {
      setInvites((prev) => [res.data!, ...prev]);
      setNewInviteMaxUses("");
      setNewInviteExpiry("");
    } else {
      setError(res.error || "Błąd generowania zaproszenia");
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setActionLoading(inviteId);
    const res = await revokeInvite(inviteId);
    if (res.success) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } else {
      setError(res.error || "Błąd unieważniania zaproszenia");
    }
    setActionLoading(null);
  }

  // Incident actions
  async function handleResolveIncident(incidentId: string) {
    setActionLoading(incidentId);
    const res = await resolveIncident(incidentId);
    if (res.success && res.data) {
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? res.data! : i)));
      onRefreshStats();
    } else {
      setError(res.error || "Błąd rozwiązywania incydentu");
    }
    setActionLoading(null);
  }

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-panel-border space-x-2">
        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "map"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          🗺️ Mapa Live
        </button>
        <button
          onClick={() => setActiveTab("territory")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "territory"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          📍 Obszar i Punkty
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "incidents"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          🚨 Incydenty
          {openIncidentCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger-red text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-lg shadow-red-500/30 animate-pulse">
              {openIncidentCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "team"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          👥 Zespół
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "invites"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          🎟️ Zaproszenia
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "chat"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          💬 Czat
        </button>
      </div>

      {/* Main Tab Panels */}
      {error && (
        <div className="p-3 bg-danger-red/10 border border-danger-red/50 text-danger-red rounded text-sm text-center">
          {error}
        </div>
      )}

      <div className="w-full">
        {loading && activeTab !== "map" && activeTab !== "territory" ? (
          <div className="w-full h-48 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-text-muted text-xs">Pobieranie danych...</p>
          </div>
        ) : (
          <div>
            {/* 1. Live Map Tab */}
            {activeTab === "map" && (
              <div className="dashboard-panel p-6">
                <LiveMapWidget token={token} memberUserIds={members.map((m) => m.userId)} activeEvent={activeEvent} />
              </div>
            )}

            {/* Territory Tab */}
            {activeTab === "territory" && (
              <TerritoryManager
                eventId={eventId}
                token={token}
                activeEvent={activeEvent}
                onUpdateEvent={onUpdateEvent}
                zones={zones}
                onRefreshZones={fetchTabData}
              />
            )}

            {/* 2. Incidents Tab */}
            {activeTab === "incidents" && (
              <div className="dashboard-panel p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-text-main">Aktywne Zgłoszenia alarmowe (SOS)</h3>
                  <button onClick={fetchTabData} className="text-xs text-primary-blue hover:underline">
                    🔄 Odśwież listę
                  </button>
                </div>

                {incidents.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-6">
                    Brak zgłoszonych incydentów dla tego wydarzenia.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-panel-border text-text-muted text-xs font-semibold uppercase">
                          <th className="pb-3">Typ</th>
                          <th className="pb-3">Zgłaszający</th>
                          <th className="pb-3">Strefa</th>
                          <th className="pb-3">Opis</th>
                          <th className="pb-3">Współrzędne</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Akcje</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-text-main divide-y divide-panel-border/30">
                        {incidents.map((inc) => (
                          <tr key={inc.id} className="hover:bg-panel-bg/40">
                            <td className="py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                inc.type === 'MEDICAL' ? 'bg-danger-red/25 text-danger-red' :
                                inc.type === 'SECURITY' ? 'bg-amber-500/25 text-amber-500' :
                                inc.type === 'LOGISTICS' ? 'bg-blue-500/25 text-blue-500' :
                                'bg-text-muted/25 text-text-muted'
                              }`}>
                                {inc.type}
                              </span>
                            </td>
                            <td className="py-3 font-medium">{inc.reporterUsername}</td>
                            <td className="py-3 text-text-muted">{inc.zoneName || "Brak"}</td>
                            <td className="py-3 max-w-xs truncate">{inc.description || "—"}</td>
                            <td className="py-3 text-xs text-text-muted">
                              {inc.locationLat ? `${inc.locationLat.toFixed(5)}, ${inc.locationLng?.toFixed(5)}` : "Brak GPS"}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                inc.status === 'OPEN' ? 'bg-danger-red/10 text-danger-red animate-pulse' :
                                inc.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-status-ok/10 text-status-ok'
                              }`}>
                                {inc.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {inc.status !== "RESOLVED" ? (
                                <button
                                  onClick={() => handleResolveIncident(inc.id)}
                                  disabled={actionLoading === inc.id}
                                  className="px-2.5 py-1 bg-status-ok text-white text-xs rounded hover:bg-emerald-600 transition-colors"
                                >
                                  {actionLoading === inc.id ? "Zamykanie..." : "Rozwiąż"}
                                </button>
                              ) : (
                                <span className="text-xs text-text-muted">Rozwiązano</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}


            {/* 4. Team Tab */}
            {activeTab === "team" && (
              <div className="dashboard-panel p-6 space-y-4">
                <h3 className="text-lg font-medium text-text-main">Członkowie zespołu i ich role</h3>
                {members.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-6">
                    Brak wolontariuszy przypisanych do tego wydarzenia. Wyślij zaproszenie!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-panel-border text-text-muted text-xs font-semibold uppercase">
                          <th className="pb-3">Login</th>
                          <th className="pb-3">Rola w projekcie</th>
                          <th className="pb-3">Data dołączenia</th>
                          <th className="pb-3 text-right">Zarządzanie</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-text-main divide-y divide-panel-border/30">
                        {members.map((m) => (
                          <tr key={m.id} className="hover:bg-panel-bg/40">
                            <td className="py-3 font-semibold">{m.username}</td>
                            <td className="py-3">
                              <select
                                value={m.role}
                                onChange={(e) => handleChangeRole(m.userId, e.target.value as any)}
                                disabled={actionLoading === m.userId}
                                className="px-2 py-1 bg-dashboard-bg border border-panel-border rounded text-xs text-text-main focus:outline-none"
                              >
                                <option value="VOLUNTEER">VOLUNTEER (Wolontariusz)</option>
                                <option value="SECURITY">SECURITY (Ochrona)</option>
                                <option value="COORDINATOR">COORDINATOR (Koordynator)</option>
                              </select>
                            </td>
                            <td className="py-3 text-text-muted text-xs">
                              {new Date(m.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                disabled={actionLoading === m.userId}
                                className="text-xs text-danger-red hover:underline"
                              >
                                Usuń z eventu
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 5. Invites Tab */}
            {activeTab === "invites" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Invite list */}
                <div className="dashboard-panel p-6 md:col-span-2 space-y-4">
                  <h3 className="text-lg font-medium text-text-main mb-4">Aktywne kody rekrutacyjne</h3>
                  {invites.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-6">
                      Brak wygenerowanych zaproszeń.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-panel-border text-text-muted text-xs font-semibold uppercase">
                            <th className="pb-3">Kod</th>
                            <th className="pb-3">Rola docelowa</th>
                            <th className="pb-3">Użycia</th>
                            <th className="pb-3">Ważność</th>
                            <th className="pb-3 text-right">Akcje</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm text-text-main divide-y divide-panel-border/30">
                          {invites.map((i) => (
                            <tr key={i.id} className="hover:bg-panel-bg/40">
                              <td className="py-3 font-mono text-primary-blue font-bold tracking-wider">{i.code}</td>
                              <td className="py-3 text-xs">{i.assignedRole}</td>
                              <td className="py-3 text-xs text-text-muted">
                                {i.currentUses} / {i.maxUses || "∞"}
                              </td>
                              <td className="py-3 text-xs text-text-muted">
                                {i.expiresAt ? new Date(i.expiresAt).toLocaleDateString() : "Bez limitu"}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleRevokeInvite(i.id)}
                                  disabled={actionLoading === i.id}
                                  className="text-xs text-danger-red hover:underline"
                                >
                                  Deaktywuj
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Generate invite form */}
                <div className="dashboard-panel p-6 flex flex-col space-y-4">
                  <h3 className="text-lg font-medium text-text-main">Generuj Zaproszenie</h3>
                  <form onSubmit={handleGenerateInvite} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-text-muted font-medium">Rola dla zapraszanych</label>
                      <select
                        value={newInviteRole}
                        onChange={(e) => setNewInviteRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                      >
                        <option value="VOLUNTEER">VOLUNTEER (Wolontariusz)</option>
                        <option value="SECURITY">SECURITY (Ochrona)</option>
                        <option value="COORDINATOR">COORDINATOR (Koordynator)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted font-medium">Maksymalna liczba użyć (opcjonalnie)</label>
                      <input
                        type="number"
                        value={newInviteMaxUses}
                        onChange={(e) => setNewInviteMaxUses(e.target.value)}
                        className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                        placeholder="Wpisz limit użyć kodów, np. 5"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted font-medium">Czas wygaśnięcia (opcjonalnie)</label>
                      <input
                        type="date"
                        value={newInviteExpiry}
                        onChange={(e) => setNewInviteExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                      />
                    </div>

                    <button type="submit" className="btn-primary w-full mt-2">
                      🎟️ Generuj Kod
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="p-6">
                <ChatManager eventId={eventId} token={token} members={members} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
