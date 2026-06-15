package com.event.peoplemanager.dto.response;

public record EventStatsResponse(
        long totalMembers,
        long activeShifts,
        long openIncidents,
        long resolvedIncidentsToday,
        long totalZones
) {}
