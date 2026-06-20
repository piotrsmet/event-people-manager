package com.event.peoplemanager.dto.response;

import java.util.UUID;

public record CustomRoleResponse(
        UUID id,
        UUID eventId,
        String name,
        String permissions
) {}
