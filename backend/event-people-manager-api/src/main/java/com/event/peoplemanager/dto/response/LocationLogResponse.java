package com.event.peoplemanager.dto.response;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

public record LocationLogResponse(
        UUID id,
        UUID userId,
        String username,
        BigDecimal latitude,
        BigDecimal longitude,
        ZonedDateTime timestamp
) {}
