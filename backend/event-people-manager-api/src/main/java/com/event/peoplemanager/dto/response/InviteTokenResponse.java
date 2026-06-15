package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.UserRole;

import java.time.ZonedDateTime;
import java.util.UUID;

public record InviteTokenResponse(
        UUID id,
        UUID eventId,
        String eventName,
        String code,
        UserRole assignedRole,
        Integer maxUses,
        Integer currentUses,
        ZonedDateTime expiresAt,
        boolean valid,
        ZonedDateTime createdAt
) {}
