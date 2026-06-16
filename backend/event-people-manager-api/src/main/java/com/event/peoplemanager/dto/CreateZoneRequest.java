package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateZoneRequest(
        @NotBlank(message = "Zone name is required")
        String name,
        String description,
        Integer capacity,
        String boundaryGeoJson,
        String color,
        String allowedRoles,
        String accessTags
) {}
