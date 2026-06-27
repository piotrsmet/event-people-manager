package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.response.NotificationResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events/{eventId}/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final ResponseMapper responseMapper;

    @GetMapping
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User currentUser
    ) {
        var notifications = notificationService.getNotificationsForUser(eventId, currentUser.getId());
        return ResponseEntity.ok(notifications.stream()
                .map(responseMapper::toNotificationResponse)
                .toList());
    }

    @PutMapping("/{notificationId}/read")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable UUID eventId,
            @PathVariable UUID notificationId
    ) {
        var updated = notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(responseMapper.toNotificationResponse(updated));
    }
}
