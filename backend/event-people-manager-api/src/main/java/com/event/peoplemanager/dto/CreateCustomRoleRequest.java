package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCustomRoleRequest(
        @NotBlank(message = "Role name is required")
        String name,
        String permissions
) {}
