package com.event.peoplemanager.dto;

import java.time.ZonedDateTime;

public record CreateEventRequest(
        String name,
        String description,
        ZonedDateTime startDate,
        ZonedDateTime endDate
) {}
