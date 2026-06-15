package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.IncidentStatus;
import com.event.peoplemanager.domain.enums.IncidentType;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

public record IncidentResponse(
        UUID id,
        UUID reporterId,
        String reporterUsername,
        UUID zoneId,
        String zoneName,
        UUID eventId,
        IncidentType type,
        String description,
        IncidentStatus status,
        BigDecimal locationLat,
        BigDecimal locationLng,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
) {}
