package com.event.peoplemanager.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record StrategicPointResponse(
        UUID id,
        UUID eventId,
        String name,
        String type,
        BigDecimal latitude,
        BigDecimal longitude,
        Double xRatio,
        Double yRatio
) {}
