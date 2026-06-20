package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateStaffingRequest;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.dto.response.StaffingRequestResponse;
import com.event.peoplemanager.dto.response.StaffingResponseResponse;
import com.event.peoplemanager.service.StaffingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events/{eventId}/staffing-requests")
@RequiredArgsConstructor
public class StaffingController {

    private final StaffingService staffingService;
    private final ResponseMapper responseMapper;

    @PostMapping
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<StaffingRequestResponse> createStaffingRequest(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateStaffingRequest request
    ) {
        var created = staffingService.createStaffingRequest(eventId, request);
        return ResponseEntity.ok(responseMapper.toStaffingRequestResponse(created));
    }

    @GetMapping
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<StaffingRequestResponse>> getStaffingRequests(
            @PathVariable UUID eventId
    ) {
        var requests = staffingService.getStaffingRequests(eventId);
        return ResponseEntity.ok(requests.stream().map(responseMapper::toStaffingRequestResponse).toList());
    }

    @PostMapping("/{requestId}/react")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<StaffingResponseResponse> reactToStaffingRequest(
            @PathVariable UUID eventId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User currentUser
    ) {
        var reacted = staffingService.reactToStaffingRequest(eventId, requestId, currentUser.getId());
        return ResponseEntity.ok(responseMapper.toStaffingResponseResponse(reacted));
    }

    @GetMapping("/{requestId}/responses")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<List<StaffingResponseResponse>> getResponses(
            @PathVariable UUID eventId,
            @PathVariable UUID requestId
    ) {
        var responses = staffingService.getResponses(eventId, requestId);
        return ResponseEntity.ok(responses.stream().map(responseMapper::toStaffingResponseResponse).toList());
    }

    @PutMapping("/{requestId}/status")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<StaffingRequestResponse> updateStatus(
            @PathVariable UUID eventId,
            @PathVariable UUID requestId,
            @RequestParam String status
    ) {
        var updated = staffingService.updateStatus(eventId, requestId, status);
        return ResponseEntity.ok(responseMapper.toStaffingRequestResponse(updated));
    }
}
