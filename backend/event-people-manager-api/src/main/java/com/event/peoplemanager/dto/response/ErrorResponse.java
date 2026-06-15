package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;

public record ErrorResponse(
        int status,
        String error,
        String message,
        ZonedDateTime timestamp,
        String path
) {}
