"use client";

import { useState, useEffect } from "react";
import LiveMapWidget from "./LiveMapWidget";
import { getZones, createZone, deleteZone } from "../actions/zone";
import { getEventMembers, updateMemberRole, removeMember } from "../actions/event";
import { getInvites, generateInvite, revokeInvite } from "../actions/invite";
import { getIncidents, resolveIncident } from "../actions/incident";
import {
  getCustomRoles,
  createCustomRole,
  deleteCustomRole,
  updateMemberCustomRole
} from "../actions/customRole";
import {
  getStaffingRequests,
  createStaffingRequest,
  getStaffingResponses,
  updateStaffingRequestStatus
} from "../actions/staffing";
import { getActiveShifts, assignShift } from "../actions/shift";
import { getStrategicPoints } from "../actions/strategicPoint";
import { ZoneResponse } from "../../types/zone";
import { EventMemberResponse, EventResponse, CustomRoleResponse } from "../../types/event";
import { InviteTokenResponse } from "../../types/invite";
import { IncidentResponse } from "../../types/incident";
import { StaffingRequestResponse, StaffingResponseResponse } from "../../types/staffing";
import { StrategicPointResponse } from "../../types/strategicPoint";
import { ShiftResponse } from "../../types/shift";
import TerritoryManager from "./TerritoryManager";
import ChatManager from "./ChatManager";

interface DashboardTabsProps {
  eventId: string;
  token: string;
  onRefreshStats: () => void;
  activeEvent: EventResponse | null;
  onUpdateEvent: (updatedEvent: EventResponse) => void;
}

type TabType = "map" | "team" | "incidents" | "territory" | "chat" | "shifts";

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
  const [customRoles, setCustomRoles] = useState<CustomRoleResponse[]>([]);
  const [staffingRequests, setStaffingRequests] = useState<StaffingRequestResponse[]>([]);
  const [staffingResponses, setStaffingResponses] = useState<Record<string, StaffingResponseResponse[]>>({});
  const [activeShifts, setActiveShifts] = useState<ShiftResponse[]>([]);
  const [strategicPoints, setStrategicPoints] = useState<StrategicPointResponse[]>([]);

  // Roles form states
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);

  // Staffing form states
  const [staffingCount, setStaffingCount] = useState("1");
  const [staffingType, setStaffingType] = useState<"zone" | "point">("zone");
  const [staffingZoneId, setStaffingZoneId] = useState("");
  const [staffingPointId, setStaffingPointId] = useState("");
  const [staffingDescription, setStaffingDescription] = useState("");

  // Shifts tab filters
  const [shiftFilter, setShiftFilter] = useState("");
  const [shiftSort, setShiftSort] = useState<"name" | "zone" | "point" | "time">("name");

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

  // Auto-polling when on shifts (Zmiany i Zapotrzebowanie) tab (refresh every 5s)
  useEffect(() => {
    if (activeTab !== "shifts") return;
    const interval = setInterval(async () => {
      try {
        // Poll active shifts
        const shRes = await getActiveShifts(eventId);
        if (shRes.success && shRes.data) setActiveShifts(shRes.data);

        // Poll staffing requests
        const srRes = await getStaffingRequests(eventId);
        if (srRes.success && srRes.data) {
          setStaffingRequests(srRes.data);
          const respMap: Record<string, StaffingResponseResponse[]> = {};
          await Promise.all(
            srRes.data.map(async (req) => {
              const respRes = await getStaffingResponses(eventId, req.id);
              if (respRes.success && respRes.data) {
                respMap[req.id] = respRes.data;
              }
            })
          );
          setStaffingResponses(respMap);
        }
      } catch (_) { /* ignore */ }
    }, 5000);
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
        
        const crRes = await getCustomRoles(eventId);
        if (crRes.success && crRes.data) setCustomRoles(crRes.data);
        
        const inviteRes = await getInvites(eventId);
        if (inviteRes.success && inviteRes.data) setInvites(inviteRes.data);
      } else if (activeTab === "incidents") {
        const res = await getIncidents(eventId, 0, 50);
        if (res.success && res.data) setIncidents(res.data.content);
        else setError(res.error || "Błąd pobierania incydentów");
      } else if (activeTab === "shifts") {
        const shRes = await getActiveShifts(eventId);
        if (shRes.success && shRes.data) setActiveShifts(shRes.data);
        else setError(shRes.error || "Błąd pobierania aktywnych zmian");

        const srRes = await getStaffingRequests(eventId);
        if (srRes.success && srRes.data) {
          setStaffingRequests(srRes.data);
          const respMap: Record<string, StaffingResponseResponse[]> = {};
          await Promise.all(
            srRes.data.map(async (req) => {
              const respRes = await getStaffingResponses(eventId, req.id);
              if (respRes.success && respRes.data) {
                respMap[req.id] = respRes.data;
              }
            })
          );
          setStaffingResponses(respMap);
        }

        const zRes = await getZones(eventId);
        if (zRes.success && zRes.data) setZones(zRes.data);

        const spRes = await getStrategicPoints(eventId);
        if (spRes.success && spRes.data) setStrategicPoints(spRes.data);
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

  async function handleAssignCustomRole(userId: string, customRoleId: string | null) {
    setActionLoading(userId);
    const res = await updateMemberCustomRole(eventId, userId, customRoleId);
    if (res.success) {
      const mRes = await getEventMembers(eventId);
      if (mRes.success && mRes.data) setMembers(mRes.data);
    } else {
      setError(res.error || "Błąd przypisywania własnej roli");
    }
    setActionLoading(null);
  }

  async function handleCreateCustomRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setError(null);
    const permsString = newRolePerms.join(",");
    const res = await createCustomRole(eventId, newRoleName.trim(), permsString);
    if (res.success && res.data) {
      setCustomRoles((prev) => [...prev, res.data!]);
      setNewRoleName("");
      setNewRolePerms([]);
    } else {
      setError(res.error || "Błąd tworzenia roli");
    }
  }

  async function handleDeleteCustomRole(roleId: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę rolę?")) return;
    setActionLoading(roleId);
    const res = await deleteCustomRole(eventId, roleId);
    if (res.success) {
      setCustomRoles((prev) => prev.filter((r) => r.id !== roleId));
      const mRes = await getEventMembers(eventId);
      if (mRes.success && mRes.data) setMembers(mRes.data);
    } else {
      setError(res.error || "Błąd usuwania roli");
    }
    setActionLoading(null);
  }

  async function handleCreateStaffingRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const count = parseInt(staffingCount);
    if (isNaN(count) || count <= 0) {
      setError("Wpisz poprawną liczbę potrzebnych osób.");
      return;
    }
    const zoneId = staffingType === "zone" && staffingZoneId ? staffingZoneId : null;
    const spId = staffingType === "point" && staffingPointId ? staffingPointId : null;

    if (!zoneId && !spId) {
      setError("Wybierz strefę lub punkt strategiczny.");
      return;
    }

    const res = await createStaffingRequest(eventId, {
      zoneId,
      strategicPointId: spId,
      countNeeded: count,
      description: staffingDescription.trim(),
    });

    if (res.success && res.data) {
      setStaffingRequests((prev) => [res.data!, ...prev]);
      setStaffingCount("1");
      setStaffingZoneId("");
      setStaffingPointId("");
      setStaffingDescription("");
      // Fetch staffing data again to load responses map
      fetchTabData();
    } else {
      setError(res.error || "Błąd zgłaszania zapotrzebowania");
    }
  }

  async function handleCloseStaffingRequest(requestId: string) {
    setActionLoading(requestId);
    const res = await updateStaffingRequestStatus(eventId, requestId, "CLOSED");
    if (res.success && res.data) {
      setStaffingRequests((prev) =>
        prev.map((r) => (r.id === requestId ? res.data! : r))
      );
    } else {
      setError(res.error || "Błąd zamykania zapotrzebowania");
    }
    setActionLoading(null);
  }

  async function handleForcedShiftAssignment(shiftId: string, zoneId: string | null, pointId: string | null) {
    setActionLoading(shiftId);
    const res = await assignShift(eventId, shiftId, zoneId, pointId);
    if (res.success && res.data) {
      const shRes = await getActiveShifts(eventId);
      if (shRes.success && shRes.data) setActiveShifts(shRes.data);
    } else {
      setError(res.error || "Błąd przymusowego przydzielania zmiany");
    }
    setActionLoading(shiftId); // clear loading after some time
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
          onClick={() => setActiveTab("shifts")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
            activeTab === "shifts"
              ? "border-primary-blue text-text-main"
              : "border-transparent text-text-muted hover:text-text-main"
          }`}
        >
          👷 Zmiany i Zapotrzebowanie
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Members List - Wide Column */}
                <div className="lg:col-span-2 dashboard-panel p-6 space-y-4">
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
                            <th className="pb-3">Rola własna</th>
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
                              <td className="py-3">
                                <select
                                  value={m.customRoleId || ""}
                                  onChange={(e) => handleAssignCustomRole(m.userId, e.target.value || null)}
                                  disabled={actionLoading === m.userId}
                                  className="px-2 py-1 bg-dashboard-bg border border-panel-border rounded text-xs text-text-main focus:outline-none"
                                >
                                  <option value="">Brak roli własnej</option>
                                  {customRoles.map((cr) => (
                                    <option key={cr.id} value={cr.id}>
                                      {cr.name}
                                    </option>
                                  ))}
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

                {/* Sidebar - Invites & Custom Roles */}
                <div className="space-y-6 flex flex-col">
                  {/* Recruitment Invites Widget */}
                  <div className="dashboard-panel p-6 flex flex-col space-y-4">
                    <h3 className="text-base font-bold text-text-main">🎟️ Zaproszenia i Kody</h3>
                    
                    <form onSubmit={handleGenerateInvite} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-text-muted font-medium">Rola dla zapraszanych</label>
                        <select
                          value={newInviteRole}
                          onChange={(e) => setNewInviteRole(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                        >
                          <option value="VOLUNTEER">VOLUNTEER (Wolontariusz)</option>
                          <option value="SECURITY">SECURITY (Ochrona)</option>
                          <option value="COORDINATOR">COORDINATOR (Koordynator)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-text-muted font-medium">Liczba użyć (opcjonalnie)</label>
                        <input
                          type="number"
                          value={newInviteMaxUses}
                          onChange={(e) => setNewInviteMaxUses(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                          placeholder="np. 5"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-text-muted font-medium">Czas wygaśnięcia (opcjonalnie)</label>
                        <input
                          type="date"
                          value={newInviteExpiry}
                          onChange={(e) => setNewInviteExpiry(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                        />
                      </div>

                      <button type="submit" className="w-full py-1.5 bg-primary-blue hover:bg-blue-600 text-white rounded text-xs font-bold transition-all">
                        Generuj Kod
                      </button>
                    </form>

                    <div className="border-t border-panel-border/30 pt-3">
                      <h4 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Aktywne Kody:</h4>
                      {invites.length === 0 ? (
                        <p className="text-xs text-text-muted italic">Brak kodów zaproszeń.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                          {invites.map((i) => (
                            <div key={i.id} className="flex justify-between items-center bg-dashboard-bg/30 p-2 border border-panel-border/50 rounded">
                              <div>
                                <span className="font-mono text-xs text-primary-blue font-bold tracking-wider">{i.code}</span>
                                <span className="text-[10px] text-text-muted block mt-0.5">
                                  {i.assignedRole} ({i.currentUses}/{i.maxUses || "∞"})
                                </span>
                              </div>
                              <button
                                onClick={() => handleRevokeInvite(i.id)}
                                disabled={actionLoading === i.id}
                                className="text-[10px] text-danger-red hover:underline"
                              >
                                Usuń
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custom Roles Widget */}
                  <div className="dashboard-panel p-6 flex flex-col space-y-4">
                    <h3 className="text-base font-bold text-text-main">⚙️ Tworzenie Ról</h3>
                    
                    <form onSubmit={handleCreateCustomRole} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-text-muted font-medium">Nazwa roli</label>
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-text-main text-xs focus:outline-none focus:border-primary-blue"
                          placeholder="np. Sektor A, Ochroniarz VIP"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-text-muted font-medium block">Uprawnienia</label>
                        {[
                          { id: "VIEW_MAP", label: "🗺️ Mapa" },
                          { id: "WRITE_CHAT", label: "💬 Czat" },
                          { id: "SEND_SOS", label: "🚨 SOS" },
                          { id: "REACT_STAFFING", label: "📦 Zapotrzebowanie" }
                        ].map((item) => {
                          const checked = newRolePerms.includes(item.id);
                          return (
                            <label key={item.id} className="flex items-center space-x-2 text-xs text-text-main cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    setNewRolePerms(newRolePerms.filter((p) => p !== item.id));
                                  } else {
                                    setNewRolePerms([...newRolePerms, item.id]);
                                  }
                                }}
                                className="rounded border-panel-border text-primary-blue focus:ring-primary-blue w-3 h-3"
                              />
                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      <button type="submit" className="w-full py-1.5 bg-primary-blue hover:bg-blue-600 text-white rounded text-xs font-bold transition-all">
                        Utwórz Rolę
                      </button>
                    </form>

                    <div className="border-t border-panel-border/30 pt-3">
                      <h4 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wide">Zdefiniowane Role:</h4>
                      {customRoles.length === 0 ? (
                        <p className="text-xs text-text-muted italic">Brak własnych ról.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                          {customRoles.map((r) => (
                            <div key={r.id} className="flex justify-between items-center bg-dashboard-bg/30 p-2 border border-panel-border/50 rounded">
                              <div className="max-w-[70%]">
                                <span className="font-bold text-xs text-primary-blue">{r.name}</span>
                                <span className="text-[10px] text-text-muted block truncate mt-0.5">
                                  {r.permissions.split(",").map((p) => {
                                    if (p === "VIEW_MAP") return "🗺️";
                                    if (p === "WRITE_CHAT") return "💬";
                                    if (p === "SEND_SOS") return "🚨";
                                    if (p === "REACT_STAFFING") return "📦";
                                    return p;
                                  }).join(" ")}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteCustomRole(r.id)}
                                disabled={actionLoading === r.id}
                                className="text-[10px] text-danger-red hover:underline"
                              >
                                Usuń
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shifts & Staffing (Zmiany i Zapotrzebowanie) Tab */}
            {activeTab === "shifts" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staffing Requests Column - Wide Column */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                  {/* Staffing Requests List */}
                  <div className="dashboard-panel p-6 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-text-main">📦 Zapotrzebowania na ludzi ({staffingRequests.length})</h3>
                      <button onClick={fetchTabData} className="text-xs text-primary-blue hover:underline">
                        🔄 Odśwież
                      </button>
                    </div>

                    {staffingRequests.length === 0 ? (
                      <p className="text-sm text-text-muted text-center py-6">
                        Brak aktywnych zapotrzebowań.
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                        {staffingRequests.map((req) => (
                          <div key={req.id} className="p-4 bg-dashboard-bg/50 border border-panel-border rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-semibold text-text-muted block uppercase tracking-wider">
                                  {req.zoneId ? "📍 STREFA" : "🗺️ PUNKT STRATEGICZNY"}
                                </span>
                                <h4 className="text-base font-bold text-text-main mt-0.5">
                                  {req.zoneId ? req.zoneName : req.strategicPointName}
                                </h4>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  req.status === 'OPEN' ? 'bg-primary-blue/20 text-primary-blue' : 'bg-text-muted/20 text-text-muted'
                                }`}>
                                  {req.status === 'OPEN' ? 'AKTYWNE' : 'ZAKOŃCZONE'}
                                </span>
                                <span className="bg-panel-border text-text-main font-bold text-xs px-2.5 py-1 rounded">
                                  Zapotrzebowanie: {req.countNeeded} os.
                                </span>
                              </div>
                            </div>

                            {req.description && (
                              <p className="text-sm text-text-muted bg-panel-bg/20 p-2.5 rounded border border-panel-border/30">
                                {req.description}
                              </p>
                            )}

                            {/* Volunteer list who reacted */}
                            <div className="border-t border-panel-border/50 pt-2.5">
                              <h5 className="text-xs font-semibold text-text-muted uppercase mb-1">
                                Zgłoszeni podwładni ({staffingResponses[req.id]?.length || 0}):
                              </h5>
                              {staffingResponses[req.id]?.length > 0 ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {staffingResponses[req.id].map((resp) => (
                                    <span key={resp.id} className="text-xs bg-status-ok/10 text-status-ok px-2.5 py-1 rounded-full border border-status-ok/30 font-medium">
                                      👤 {resp.username}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-text-muted italic pt-0.5">Brak zgłoszeń do tego zadania.</p>
                              )}
                            </div>

                            {req.status === "OPEN" && (
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => handleCloseStaffingRequest(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="px-3 py-1 bg-panel-border border border-panel-border text-text-main text-xs font-bold rounded hover:bg-dashboard-bg transition-colors"
                                >
                                  {actionLoading === req.id ? "Zamykanie..." : "Oznacz jako Zrealizowane"}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create Request Form */}
                  <div className="dashboard-panel p-6 flex flex-col space-y-4">
                    <h3 className="text-lg font-medium text-text-main">Zgłoś nowe zapotrzebowanie</h3>
                    <form onSubmit={handleCreateStaffingRequest} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted font-medium">Typ przypisania</label>
                        <div className="flex bg-dashboard-bg p-1 rounded border border-panel-border">
                          <button
                            type="button"
                            onClick={() => setStaffingType("zone")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                              staffingType === "zone" ? "bg-panel-border text-text-main" : "text-text-muted"
                            }`}
                          >
                            Strefa
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaffingType("point")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                              staffingType === "point" ? "bg-panel-border text-text-main" : "text-text-muted"
                            }`}
                          >
                            Punkt Strategiczny
                          </button>
                        </div>
                      </div>

                      {staffingType === "zone" ? (
                        <div className="space-y-1">
                          <label className="text-xs text-text-muted font-medium">Strefa</label>
                          <select
                            value={staffingZoneId}
                            onChange={(e) => setStaffingZoneId(e.target.value)}
                            className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                            required
                          >
                            <option value="">-- Wybierz strefę --</option>
                            {zones.map((z) => (
                              <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-xs text-text-muted font-medium">Punkt strategiczny</label>
                          <select
                            value={staffingPointId}
                            onChange={(e) => setStaffingPointId(e.target.value)}
                            className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none focus:border-primary-blue"
                            required
                          >
                            <option value="">-- Wybierz punkt --</option>
                            {strategicPoints.map((sp) => (
                              <option key={sp.id} value={sp.id}>{sp.name} ({sp.type})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs text-text-muted font-medium">Liczba osób potrzebna</label>
                        <input
                          type="number"
                          value={staffingCount}
                          onChange={(e) => setStaffingCount(e.target.value)}
                          className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none"
                          min="1"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-text-muted font-medium">Dodatkowe instrukcje (opcjonalnie)</label>
                        <textarea
                          value={staffingDescription}
                          onChange={(e) => setStaffingDescription(e.target.value)}
                          className="w-full px-3 py-2 bg-dashboard-bg border border-panel-border rounded text-text-main text-sm focus:outline-none h-20 resize-none"
                          placeholder="np. Potrzebne wsparcie przy bramkach wejściowych"
                        />
                      </div>

                      <button type="submit" className="btn-primary w-full mt-2">
                        📡 Wyślij zapotrzebowanie
                      </button>
                    </form>
                  </div>
                </div>

                {/* Active Shifts Column - Sidebar */}
                <div className="dashboard-panel p-6 space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-base font-bold text-text-main">👷 Aktywne Zmiany ({activeShifts.length})</h3>
                    <div className="flex flex-col space-y-2">
                      <input
                        type="text"
                        value={shiftFilter}
                        onChange={(e) => setShiftFilter(e.target.value)}
                        placeholder="Szukaj wolontariusza..."
                        className="px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-xs text-text-main focus:outline-none focus:border-primary-blue w-full"
                      />
                      <select
                        value={shiftSort}
                        onChange={(e) => setShiftSort(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-dashboard-bg border border-panel-border rounded text-xs text-text-main focus:outline-none focus:border-primary-blue w-full font-medium"
                      >
                        <option value="name">Sortuj: Nazwa A-Z</option>
                        <option value="zone">Sortuj: Strefa</option>
                        <option value="point">Sortuj: Punkt Strat.</option>
                        <option value="time">Sortuj: Czas Rozpoczęcia</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-muted">
                    Podgląd na żywo kto pracuje i gdzie. Możesz przymusowo zmienić przydział strefy lub punktu strategicznego.
                  </p>

                  {activeShifts.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-8">
                      Brak wolontariuszy na aktywnej zmianie.
                    </p>
                  ) : (() => {
                    const filtered = activeShifts.filter((s) =>
                      s.username?.toLowerCase().includes(shiftFilter.toLowerCase())
                    );
                    const sorted = [...filtered].sort((a, b) => {
                      if (shiftSort === "name") return (a.username || "").localeCompare(b.username || "");
                      if (shiftSort === "zone") return (a.zoneName || "zzz").localeCompare(b.zoneName || "zzz");
                      if (shiftSort === "point") return (a.strategicPointName || "zzz").localeCompare(b.strategicPointName || "zzz");
                      if (shiftSort === "time") return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                      return 0;
                    });

                    return (
                      <div className="space-y-3 overflow-y-auto max-h-[750px] pr-1">
                        {sorted.map((shift) => (
                          <div key={shift.id} className="p-3 bg-dashboard-bg/30 border border-panel-border/50 rounded space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm text-text-main">{shift.username}</span>
                              <span className="text-[10px] text-text-muted">
                                Od {new Date(shift.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {shift.zoneId ? (
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/25">
                                  📍 {shift.zoneName}
                                </span>
                              ) : null}
                              {shift.strategicPointId ? (
                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25">
                                  🗺️ {shift.strategicPointName}
                                </span>
                              ) : null}
                              {!shift.zoneId && !shift.strategicPointId ? (
                                <span className="text-[10px] bg-panel-border text-text-muted px-2 py-0.5 rounded">
                                  Brak przydziału
                                </span>
                              ) : null}
                            </div>

                            <div className="pt-1.5 border-t border-panel-border/20 flex flex-col space-y-1">
                              <label className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Zmień przydział:</label>
                              <select
                                disabled={actionLoading === shift.id}
                                value={
                                  shift.zoneId
                                    ? `zone:${shift.zoneId}`
                                    : shift.strategicPointId
                                    ? `point:${shift.strategicPointId}`
                                    : ""
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (!val) {
                                    handleForcedShiftAssignment(shift.id, null, null);
                                  } else {
                                    const [type, id] = val.split(":");
                                    if (type === "zone") {
                                      handleForcedShiftAssignment(shift.id, id, null);
                                    } else {
                                      handleForcedShiftAssignment(shift.id, null, id);
                                    }
                                  }
                                }}
                                className="w-full px-2 py-1 bg-dashboard-bg border border-panel-border rounded text-[11px] text-text-main focus:outline-none focus:border-primary-blue cursor-pointer"
                              >
                                <option value="">-- Brak przydziału --</option>
                                <optgroup label="Strefy">
                                  {zones.map((z) => (
                                    <option key={z.id} value={`zone:${z.id}`}>Strefa: {z.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Punkty Strategiczne">
                                  {strategicPoints.map((sp) => (
                                    <option key={sp.id} value={`point:${sp.id}`}>Punkt: {sp.name}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
