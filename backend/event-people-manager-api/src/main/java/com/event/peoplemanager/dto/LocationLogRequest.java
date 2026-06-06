package com.event.peoplemanager.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LocationLogRequest(
    UUID userId,
    UUID shiftId,
    BigDecimal latitude,
    BigDecimal longitude
) {}
