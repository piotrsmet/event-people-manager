package com.event.peoplemanager.dto.response;

import com.event.peoplemanager.domain.entity.*;
import com.event.peoplemanager.repository.EventMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ResponseMapper {

    private final EventMemberRepository eventMemberRepository;

    public UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getCreatedAt()
        );
    }

    public EventResponse toEventResponse(Event event) {
        long memberCount = eventMemberRepository.countByEventId(event.getId());
        return new EventResponse(
                event.getId(),
                event.getName(),
                event.getDescription(),
                event.getStartDate(),
                event.getEndDate(),
                event.getOwner().getUsername(),
                event.getStatus(),
                memberCount,
                event.isOutdoor(),
                event.getBoundaryGeoJson(),
                event.getBuildingPlanBase64(),
                event.getCustomRoles(),
                event.getCustomTags(),
                event.getCreatedAt()
        );
    }

    public ShiftResponse toShiftResponse(Shift shift) {
        return new ShiftResponse(
                shift.getId(),
                shift.getUser().getId(),
                shift.getUser().getUsername(),
                shift.getZone() != null ? shift.getZone().getId() : null,
                shift.getZone() != null ? shift.getZone().getName() : null,
                shift.getEvent() != null ? shift.getEvent().getId() : null,
                shift.getStartTime(),
                shift.getEndTime(),
                shift.getStatus(),
                shift.getCreatedAt()
        );
    }

    public IncidentResponse toIncidentResponse(Incident incident) {
        return new IncidentResponse(
                incident.getId(),
                incident.getReporter().getId(),
                incident.getReporter().getUsername(),
                incident.getZone() != null ? incident.getZone().getId() : null,
                incident.getZone() != null ? incident.getZone().getName() : null,
                incident.getEvent() != null ? incident.getEvent().getId() : null,
                incident.getType(),
                incident.getDescription(),
                incident.getStatus(),
                incident.getLocationLat(),
                incident.getLocationLng(),
                incident.getCreatedAt(),
                incident.getUpdatedAt()
        );
    }

    public LocationLogResponse toLocationLogResponse(LocationLog log) {
        return new LocationLogResponse(
                log.getId(),
                log.getUser().getId(),
                log.getUser().getUsername(),
                log.getLatitude(),
                log.getLongitude(),
                log.getTimestamp()
        );
    }

    public EventMemberResponse toEventMemberResponse(EventMember member) {
        return new EventMemberResponse(
                member.getId(),
                member.getUser().getId(),
                member.getUser().getUsername(),
                member.getRole(),
                member.getJoinedAt()
        );
    }

    public InviteTokenResponse toInviteTokenResponse(InviteToken token) {
        return new InviteTokenResponse(
                token.getId(),
                token.getEvent().getId(),
                token.getEvent().getName(),
                token.getCode(),
                token.getAssignedRole(),
                token.getMaxUses(),
                token.getCurrentUses(),
                token.getExpiresAt(),
                token.isValid(),
                token.getCreatedAt()
        );
    }

    public ZoneResponse toZoneResponse(Zone zone) {
        return new ZoneResponse(
                zone.getId(),
                zone.getName(),
                zone.getDescription(),
                zone.getCapacity(),
                zone.getEvent() != null ? zone.getEvent().getId() : null,
                zone.getCreatedAt(),
                zone.getBoundaryGeoJson(),
                zone.getColor(),
                zone.getAllowedRoles(),
                zone.getAccessTags()
        );
    }

    public StrategicPointResponse toStrategicPointResponse(StrategicPoint point) {
        return new StrategicPointResponse(
                point.getId(),
                point.getEvent().getId(),
                point.getName(),
                point.getType(),
                point.getLatitude(),
                point.getLongitude(),
                point.getXRatio(),
                point.getYRatio()
        );
    }

    public ChatMessageResponse toChatMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getEvent().getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getRecipient() != null ? message.getRecipient().getId() : null,
                message.getRecipient() != null ? message.getRecipient().getUsername() : null,
                message.getChannel(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}

