package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateStaffingRequest(
        UUID zoneId,
        UUID strategicPointId,
        @NotNull(message = "Count needed is required")
        Integer countNeeded,
        String description
) {}
