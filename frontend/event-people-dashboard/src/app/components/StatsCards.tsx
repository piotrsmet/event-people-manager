import { EventStatsResponse } from "../../types/event";

interface StatsCardsProps {
  stats: EventStatsResponse | null;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const defaultStats: EventStatsResponse = stats || {
    totalMembers: 0,
    activeShifts: 0,
    openIncidents: 0,
    resolvedIncidentsToday: 0,
    totalZones: 0,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {/* Total Members */}
      <div className="dashboard-panel p-4 bg-gradient-to-br from-panel-bg to-panel-bg/80 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Członkowie zespołu
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-bold text-text-main">
            {defaultStats.totalMembers}
          </span>
          <span className="text-xs text-text-muted">razem</span>
        </div>
        <div className="absolute right-3 bottom-3 text-primary-blue/10 pointer-events-none text-4xl font-bold">
          👥
        </div>
      </div>

      {/* Active Shifts */}
      <div className="dashboard-panel p-4 bg-gradient-to-br from-panel-bg to-panel-bg/80 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Aktywne zmiany
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-bold text-status-ok">
            {defaultStats.activeShifts}
          </span>
          <span className="text-xs text-text-muted">na służbie</span>
        </div>
        <div className="absolute right-3 bottom-3 text-status-ok/10 pointer-events-none text-4xl font-bold">
          ⏱️
        </div>
      </div>

      {/* Open Incidents */}
      <div className={`dashboard-panel p-4 relative overflow-hidden flex flex-col justify-between min-h-[100px] border transition-all duration-300 ${
        defaultStats.openIncidents > 0 
          ? 'border-danger-red/60 bg-danger-red/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'border-panel-border bg-gradient-to-br from-panel-bg to-panel-bg/80'
      }`}>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Otwarte incydenty
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className={`text-3xl font-bold ${defaultStats.openIncidents > 0 ? 'text-danger-red' : 'text-text-main'}`}>
            {defaultStats.openIncidents}
          </span>
          <span className="text-xs text-text-muted">aktywne</span>
        </div>
        <div className={`absolute right-3 bottom-3 pointer-events-none text-4xl font-bold ${
          defaultStats.openIncidents > 0 ? 'text-danger-red/20' : 'text-text-muted/10'
        }`}>
          🚨
        </div>
      </div>

      {/* Resolved Today */}
      <div className="dashboard-panel p-4 bg-gradient-to-br from-panel-bg to-panel-bg/80 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Rozwiązane dziś
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-bold text-text-main">
            {defaultStats.resolvedIncidentsToday}
          </span>
          <span className="text-xs text-text-muted">zamknięte</span>
        </div>
        <div className="absolute right-3 bottom-3 text-text-muted/10 pointer-events-none text-4xl font-bold">
          ✅
        </div>
      </div>

      {/* Total Zones */}
      <div className="dashboard-panel p-4 bg-gradient-to-br from-panel-bg to-panel-bg/80 relative overflow-hidden flex flex-col justify-between min-h-[100px]">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Obszary/Strefy
        </span>
        <div className="flex items-baseline space-x-2 mt-2">
          <span className="text-3xl font-bold text-text-main">
            {defaultStats.totalZones}
          </span>
          <span className="text-xs text-text-muted">stref</span>
        </div>
        <div className="absolute right-3 bottom-3 text-text-muted/10 pointer-events-none text-4xl font-bold">
          📍
        </div>
      </div>
    </div>
  );
}
