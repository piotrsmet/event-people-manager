package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.response.ChatMessageResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final ResponseMapper responseMapper;

    @GetMapping("/{eventId}/chat")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<ChatMessageResponse>> getGeneralChatHistory(
            @PathVariable UUID eventId,
            @RequestParam(defaultValue = "GENERAL") String channel
    ) {
        var messages = chatService.getGeneralChatHistory(eventId);
        return ResponseEntity.ok(messages.stream().map(responseMapper::toChatMessageResponse).toList());
    }

    @GetMapping("/{eventId}/chat/coordinators")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<ChatMessageResponse>> getMyCoordinatorThread(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User currentUser
    ) {
        var messages = chatService.getCoordinatorThreadHistory(eventId, currentUser.getId());
        return ResponseEntity.ok(messages.stream().map(responseMapper::toChatMessageResponse).toList());
    }

    @GetMapping("/{eventId}/chat/coordinators/{volunteerId}")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<List<ChatMessageResponse>> getVolunteerCoordinatorThread(
            @PathVariable UUID eventId,
            @PathVariable UUID volunteerId
    ) {
        var messages = chatService.getCoordinatorThreadHistory(eventId, volunteerId);
        return ResponseEntity.ok(messages.stream().map(responseMapper::toChatMessageResponse).toList());
    }
}
