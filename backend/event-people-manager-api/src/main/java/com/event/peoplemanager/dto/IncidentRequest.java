package com.event.peoplemanager.dto;

import com.event.peoplemanager.domain.enums.IncidentType;
import java.math.BigDecimal;
import java.util.UUID;

public record IncidentRequest(
    UUID reporterId,
    UUID zoneId,
    IncidentType type,
    String description,
    BigDecimal locationLat,
    BigDecimal locationLng
) {}
