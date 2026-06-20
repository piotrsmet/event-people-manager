package com.event.peoplemanager.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ChatMessageRequest(
    @NotBlank(message = "Treść wiadomości nie może być pusta")
    String content,
    
    UUID recipientId,
    
    String channel
) {}
