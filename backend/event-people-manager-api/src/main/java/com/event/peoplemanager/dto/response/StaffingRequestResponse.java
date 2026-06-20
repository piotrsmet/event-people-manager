package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;
import java.util.UUID;

public record StaffingRequestResponse(
        UUID id,
        UUID eventId,
        UUID zoneId,
        String zoneName,
        UUID strategicPointId,
        String strategicPointName,
        Integer countNeeded,
        String description,
        String status,
        Boolean userReacted,
        ZonedDateTime createdAt
) {}
