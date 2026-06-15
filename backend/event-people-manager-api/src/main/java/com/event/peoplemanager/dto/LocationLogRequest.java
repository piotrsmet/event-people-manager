package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record LocationLogRequest(
        @NotNull(message = "User ID is required")
        UUID userId,
        UUID shiftId,
        @NotNull(message = "Latitude is required")
        BigDecimal latitude,
        @NotNull(message = "Longitude is required")
        BigDecimal longitude
) {}
