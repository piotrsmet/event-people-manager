package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateEventRequest;
import com.event.peoplemanager.dto.UpdateEventRequest;
import com.event.peoplemanager.dto.response.EventMemberResponse;
import com.event.peoplemanager.dto.response.EventResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final ResponseMapper responseMapper;

    @PostMapping
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        var event = eventService.createEvent(request, currentUser.getId());
        return ResponseEntity.ok(responseMapper.toEventResponse(event));
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> getMyEvents(
            @AuthenticationPrincipal User currentUser
    ) {
        var events = eventService.getEventsForUser(currentUser.getId());
        return ResponseEntity.ok(events.stream().map(responseMapper::toEventResponse).toList());
    }

    @GetMapping("/{eventId}")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<EventResponse> getEvent(@PathVariable UUID eventId) {
        var event = eventService.getEvent(eventId);
        return ResponseEntity.ok(responseMapper.toEventResponse(event));
    }

    @PutMapping("/{eventId}")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable UUID eventId,
            @Valid @RequestBody UpdateEventRequest request
    ) {
        var event = eventService.updateEvent(eventId, request);
        return ResponseEntity.ok(responseMapper.toEventResponse(event));
    }

    @GetMapping("/{eventId}/members")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<EventMemberResponse>> getEventMembers(@PathVariable UUID eventId) {
        var members = eventService.getEventMembers(eventId);
        return ResponseEntity.ok(members.stream().map(responseMapper::toEventMemberResponse).toList());
    }
}
