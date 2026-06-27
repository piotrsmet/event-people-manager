package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        UUID userId,
        UUID eventId,
        String title,
        String message,
        String type,
        boolean read,
        ZonedDateTime createdAt
) {}
