package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.ZonedDateTime;

public record CreateEventRequest(
        @NotBlank(message = "Event name is required")
        String name,
        String description,
        ZonedDateTime startDate,
        ZonedDateTime endDate,
        Boolean outdoor,
        String boundaryGeoJson,
        String buildingPlanBase64,
        String customRoles,
        String customTags
) {}
