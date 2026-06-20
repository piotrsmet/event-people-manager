package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.UserRole;

import java.time.ZonedDateTime;
import java.util.UUID;

public record EventMemberResponse(
        UUID id,
        UUID userId,
        String username,
        UserRole role,
        UUID customRoleId,
        String customRoleName,
        String permissions,
        ZonedDateTime joinedAt
) {}
