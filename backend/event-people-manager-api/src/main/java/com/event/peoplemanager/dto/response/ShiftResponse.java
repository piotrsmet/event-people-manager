package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.ShiftStatus;

import java.time.ZonedDateTime;
import java.util.UUID;

public record ShiftResponse(
        UUID id,
        UUID userId,
        String username,
        UUID zoneId,
        String zoneName,
        UUID eventId,
        ZonedDateTime startTime,
        ZonedDateTime endTime,
        ShiftStatus status,
        ZonedDateTime createdAt
) {}
