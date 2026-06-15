package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateInviteRequest;
import com.event.peoplemanager.dto.JoinEventRequest;
import com.event.peoplemanager.dto.response.EventMemberResponse;
import com.event.peoplemanager.dto.response.InviteTokenResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;
    private final ResponseMapper responseMapper;

    @PostMapping("/events/{eventId}/invites")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<InviteTokenResponse> generateInvite(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateInviteRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        var token = inviteService.generateInvite(eventId, request, currentUser.getId());
        return ResponseEntity.ok(responseMapper.toInviteTokenResponse(token));
    }

    @GetMapping("/events/{eventId}/invites")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<List<InviteTokenResponse>> getInvites(@PathVariable UUID eventId) {
        var tokens = inviteService.getInvitesForEvent(eventId);
        return ResponseEntity.ok(tokens.stream().map(responseMapper::toInviteTokenResponse).toList());
    }

    @DeleteMapping("/invites/{inviteId}")
    @PreAuthorize("@eventSecurity.canRevokeInvite(#inviteId)")
    public ResponseEntity<Void> revokeInvite(@PathVariable UUID inviteId) {
        inviteService.revokeInvite(inviteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invites/join")
    public ResponseEntity<EventMemberResponse> joinEvent(
            @Valid @RequestBody JoinEventRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        var member = inviteService.joinEvent(request.code(), currentUser.getId());
        return ResponseEntity.ok(responseMapper.toEventMemberResponse(member));
    }
}
