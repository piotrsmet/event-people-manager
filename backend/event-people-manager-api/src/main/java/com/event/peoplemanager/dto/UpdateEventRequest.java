package com.event.peoplemanager.dto;

import com.event.peoplemanager.domain.enums.EventStatus;

import java.time.ZonedDateTime;

public record UpdateEventRequest(
        String name,
        String description,
        ZonedDateTime startDate,
        ZonedDateTime endDate,
        EventStatus status,
        Boolean outdoor,
        String boundaryGeoJson,
        String buildingPlanBase64,
        String customRoles,
        String customTags
) {}
