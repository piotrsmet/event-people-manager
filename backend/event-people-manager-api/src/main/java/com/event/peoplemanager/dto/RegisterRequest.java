package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
        @NotBlank(message = "Username is required")
        String username,
        @NotBlank(message = "Password is required")
        String password,
        com.event.peoplemanager.domain.enums.UserRole role
) {}
