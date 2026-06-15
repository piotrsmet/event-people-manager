package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateEventRequest;
import com.event.peoplemanager.dto.UpdateEventRequest;
import com.event.peoplemanager.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @PostMapping
    public ResponseEntity<Event> createEvent(
            @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(eventService.createEvent(request, currentUser.getId()));
    }

    @GetMapping
    public ResponseEntity<List<Event>> getMyEvents(
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(eventService.getEventsForUser(currentUser.getId()));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<Event> getEvent(@PathVariable UUID eventId) {
        return ResponseEntity.ok(eventService.getEvent(eventId));
    }

    @PutMapping("/{eventId}")
    public ResponseEntity<Event> updateEvent(
            @PathVariable UUID eventId,
            @RequestBody UpdateEventRequest request
    ) {
        return ResponseEntity.ok(eventService.updateEvent(eventId, request));
    }

    @GetMapping("/{eventId}/members")
    public ResponseEntity<List<EventMember>> getEventMembers(@PathVariable UUID eventId) {
        return ResponseEntity.ok(eventService.getEventMembers(eventId));
    }
}
