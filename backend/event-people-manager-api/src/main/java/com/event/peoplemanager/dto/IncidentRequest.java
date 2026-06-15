package com.event.peoplemanager.dto;

import com.event.peoplemanager.domain.enums.IncidentType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record IncidentRequest(
        @NotNull(message = "Reporter ID is required")
        UUID reporterId,
        @NotNull(message = "Event ID is required")
        UUID eventId,
        UUID zoneId,
        @NotNull(message = "Incident type is required")
        IncidentType type,
        String description,
        BigDecimal locationLat,
        BigDecimal locationLng
) {}
