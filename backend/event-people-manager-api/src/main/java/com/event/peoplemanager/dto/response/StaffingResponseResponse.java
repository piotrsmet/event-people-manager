package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;
import java.util.UUID;

public record StaffingResponseResponse(
        UUID id,
        UUID staffingRequestId,
        UUID userId,
        String username,
        ZonedDateTime createdAt
) {}
