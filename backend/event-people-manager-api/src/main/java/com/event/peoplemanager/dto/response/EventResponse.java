package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.EventStatus;

import java.time.ZonedDateTime;
import java.util.UUID;

public record EventResponse(
        UUID id,
        String name,
        String description,
        ZonedDateTime startDate,
        ZonedDateTime endDate,
        String ownerUsername,
        EventStatus status,
        long memberCount,
        ZonedDateTime createdAt
) {}
