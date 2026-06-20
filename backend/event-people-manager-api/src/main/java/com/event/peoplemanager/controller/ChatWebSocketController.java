package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.enums.UserRole;
import com.event.peoplemanager.dto.ChatMessageRequest;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;
    private final ResponseMapper responseMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/events/{eventId}/chat/general")
    public void sendGeneralMessage(
            @DestinationVariable UUID eventId,
            @Payload ChatMessageRequest request,
            Principal principal
    ) {
        User sender = getAuthenticatedUser(principal);
        var dbRequest = new ChatMessageRequest(request.content(), null, "GENERAL");
        var message = chatService.saveMessage(eventId, sender.getId(), dbRequest);
        var response = responseMapper.toChatMessageResponse(message);

        messagingTemplate.convertAndSend("/topic/events/" + eventId + "/chat/general", response);
    }

    @MessageMapping("/events/{eventId}/chat/coordinators/send")
    public void sendCoordinatorMessage(
            @DestinationVariable UUID eventId,
            @Payload ChatMessageRequest request,
            Principal principal
    ) {
        User sender = getAuthenticatedUser(principal);
        
        UUID volunteerId;
        ChatMessageRequest dbRequest;
        
        // Sprawdzamy czy nadawca jest koordynatorem
        if (sender.getRole() == UserRole.COORDINATOR) {
            if (request.recipientId() == null) {
                throw new IllegalArgumentException("Koordynator musi podać odbiorcę (recipientId)");
            }
            volunteerId = request.recipientId();
            dbRequest = new ChatMessageRequest(request.content(), volunteerId, "COORDINATORS");
        } else {
            volunteerId = sender.getId();
            dbRequest = new ChatMessageRequest(request.content(), null, "COORDINATORS");
        }

        var message = chatService.saveMessage(eventId, sender.getId(), dbRequest);
        var response = responseMapper.toChatMessageResponse(message);

        // Wysyłamy do wszystkich koordynatorów
        messagingTemplate.convertAndSend("/topic/events/" + eventId + "/chat/coordinators", response);
        // Wysyłamy do konkretnego wolontariusza (jego prywatny kanał)
        messagingTemplate.convertAndSend("/topic/events/" + eventId + "/chat/user/" + volunteerId, response);
    }

    private User getAuthenticatedUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof User user) {
                return user;
            }
        }
        throw new IllegalStateException("User not authenticated");
    }
}
