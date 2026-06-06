package com.event.peoplemanager.dto;

import com.event.peoplemanager.domain.enums.UserRole;

public record RegisterRequest(
        String username,
        String password,
        UserRole role
) {}
