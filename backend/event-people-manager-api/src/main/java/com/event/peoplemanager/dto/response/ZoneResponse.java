package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;
import java.util.UUID;

public record ZoneResponse(
        UUID id,
        String name,
        String description,
        Integer capacity,
        UUID eventId,
        ZonedDateTime createdAt
) {}
