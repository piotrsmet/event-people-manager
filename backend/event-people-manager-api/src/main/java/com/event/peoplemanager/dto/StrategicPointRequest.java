package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record StrategicPointRequest(
        @NotBlank(message = "Point name is required")
        String name,
        @NotBlank(message = "Point type is required")
        String type,
        BigDecimal latitude,
        BigDecimal longitude,
        Double xRatio,
        Double yRatio
) {}
