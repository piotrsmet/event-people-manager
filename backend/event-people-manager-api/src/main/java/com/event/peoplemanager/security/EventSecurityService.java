package com.event.peoplemanager.security;

import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.enums.UserRole;
import com.event.peoplemanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Service("eventSecurity")
@RequiredArgsConstructor
public class EventSecurityService {

    private final EventMemberRepository eventMemberRepository;
    private final InviteTokenRepository inviteTokenRepository;
    private final ZoneRepository zoneRepository;
    private final ShiftRepository shiftRepository;
    private final IncidentRepository incidentRepository;
    private final StrategicPointRepository strategicPointRepository;

    public boolean hasEventRole(UUID eventId, String... roleNames) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }

        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }

        Optional<EventMember> memberOpt = eventMemberRepository.findByEventIdAndUserId(eventId, user.getId());
        if (memberOpt.isEmpty()) {
            return false;
        }

        UserRole memberRole = memberOpt.get().getRole();
        return Arrays.stream(roleNames)
                .map(UserRole::valueOf)
                .anyMatch(r -> r == memberRole);
    }

    public boolean isEventMember(UUID eventId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }

        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }

        return eventMemberRepository.existsByEventIdAndUserId(eventId, user.getId());
    }

    public boolean canRevokeInvite(UUID inviteId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }
        return inviteTokenRepository.findById(inviteId)
                .map(token -> eventMemberRepository.findByEventIdAndUserId(token.getEvent().getId(), user.getId())
                        .map(member -> member.getRole() == UserRole.COORDINATOR)
                        .orElse(false))
                .orElse(false);
    }

    public boolean canManageZone(UUID zoneId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }
        return zoneRepository.findById(zoneId)
                .map(zone -> eventMemberRepository.findByEventIdAndUserId(zone.getEvent().getId(), user.getId())
                        .map(member -> member.getRole() == UserRole.COORDINATOR)
                        .orElse(false))
                .orElse(false);
    }

    public boolean canManageShift(UUID shiftId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }
        return shiftRepository.findById(shiftId)
                .map(shift -> {
                    if (shift.getUser().getId().equals(user.getId())) {
                        return true;
                    }
                    return eventMemberRepository.findByEventIdAndUserId(shift.getEvent().getId(), user.getId())
                            .map(member -> member.getRole() == UserRole.COORDINATOR)
                            .orElse(false);
                })
                .orElse(false);
    }

    public boolean canResolveIncident(UUID incidentId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }
        return incidentRepository.findById(incidentId)
                .map(incident -> eventMemberRepository.findByEventIdAndUserId(incident.getEvent().getId(), user.getId())
                        .map(member -> member.getRole() == UserRole.COORDINATOR || member.getRole() == UserRole.SECURITY)
                        .orElse(false))
                .orElse(false);
    }

    public boolean canManageStrategicPoint(UUID pointId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            return false;
        }
        if (user.getRole() == UserRole.COORDINATOR) {
            return true;
        }
        return strategicPointRepository.findById(pointId)
                .map(point -> eventMemberRepository.findByEventIdAndUserId(point.getEvent().getId(), user.getId())
                        .map(member -> member.getRole() == UserRole.COORDINATOR)
                        .orElse(false))
                .orElse(false);
    }
}
