package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.domain.entity.InviteToken;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.CreateInviteRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.EventMemberRepository;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.InviteTokenRepository;
import com.event.peoplemanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final InviteTokenRepository inviteTokenRepository;
    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserRepository userRepository;

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Transactional
    public InviteToken generateInvite(UUID eventId, CreateInviteRequest request, UUID createdById) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + createdById));

        String code = generateUniqueCode();

        InviteToken token = InviteToken.builder()
                .event(event)
                .code(code)
                .assignedRole(request.assignedRole())
                .maxUses(request.maxUses())
                .expiresAt(request.expiresAt())
                .createdBy(createdBy)
                .build();

        return inviteTokenRepository.save(token);
    }

    @Transactional
    public EventMember joinEvent(String code, UUID userId) {
        InviteToken token = inviteTokenRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code: " + code));

        if (!token.isValid()) {
            throw new IllegalStateException("Invite code has expired or reached maximum uses");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (eventMemberRepository.existsByEventIdAndUserId(token.getEvent().getId(), userId)) {
            throw new IllegalStateException("User is already a member of this event");
        }

        EventMember member = EventMember.builder()
                .event(token.getEvent())
                .user(user)
                .role(token.getAssignedRole())
                .build();

        member = eventMemberRepository.save(member);

        // Inkrementuj liczbę użyć tokenu
        token.setCurrentUses(token.getCurrentUses() + 1);
        inviteTokenRepository.save(token);

        return member;
    }

    public List<InviteToken> getInvitesForEvent(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return inviteTokenRepository.findByEventId(eventId);
    }

    @Transactional
    public void revokeInvite(UUID inviteId) {
        if (!inviteTokenRepository.existsById(inviteId)) {
            throw new ResourceNotFoundException("Invite not found: " + inviteId);
        }
        inviteTokenRepository.deleteById(inviteId);
    }

    private String generateUniqueCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(CODE_LENGTH);
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (inviteTokenRepository.findByCode(code).isPresent());

        return code;
    }
}
