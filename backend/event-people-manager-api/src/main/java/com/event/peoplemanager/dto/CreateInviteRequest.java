package com.event.peoplemanager.dto;

import com.event.peoplemanager.domain.enums.UserRole;

import java.time.ZonedDateTime;

public record CreateInviteRequest(
        UserRole assignedRole,
        Integer maxUses,
        ZonedDateTime expiresAt
) {}
