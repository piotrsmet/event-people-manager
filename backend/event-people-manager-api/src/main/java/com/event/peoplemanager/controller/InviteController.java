package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.domain.entity.InviteToken;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateInviteRequest;
import com.event.peoplemanager.dto.JoinEventRequest;
import com.event.peoplemanager.service.InviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    @PostMapping("/events/{eventId}/invites")
    public ResponseEntity<InviteToken> generateInvite(
            @PathVariable UUID eventId,
            @RequestBody CreateInviteRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(inviteService.generateInvite(eventId, request, currentUser.getId()));
    }

    @GetMapping("/events/{eventId}/invites")
    public ResponseEntity<List<InviteToken>> getInvites(@PathVariable UUID eventId) {
        return ResponseEntity.ok(inviteService.getInvitesForEvent(eventId));
    }

    @DeleteMapping("/invites/{inviteId}")
    public ResponseEntity<Void> revokeInvite(@PathVariable UUID inviteId) {
        inviteService.revokeInvite(inviteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invites/join")
    public ResponseEntity<EventMember> joinEvent(
            @RequestBody JoinEventRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(inviteService.joinEvent(request.code(), currentUser.getId()));
    }
}
