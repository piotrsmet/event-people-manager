package com.event.peoplemanager.dto.response;

import java.time.ZonedDateTime;
import java.util.UUID;

public record ChatMessageResponse(
    UUID id,
    UUID eventId,
    UUID senderId,
    String senderUsername,
    UUID recipientId,
    String recipientUsername,
    String channel,
    String content,
    ZonedDateTime createdAt
) {}
