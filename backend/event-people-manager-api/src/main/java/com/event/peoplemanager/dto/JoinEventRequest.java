package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinEventRequest(
        @NotBlank(message = "Invite code is required")
        String code
) {}
