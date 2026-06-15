package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.enums.UserRole;

import java.time.ZonedDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        UserRole role,
        ZonedDateTime createdAt
) {}
