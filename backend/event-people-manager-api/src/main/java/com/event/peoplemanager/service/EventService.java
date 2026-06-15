package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.enums.EventStatus;
import com.event.peoplemanager.domain.enums.UserRole;
import com.event.peoplemanager.dto.CreateEventRequest;
import com.event.peoplemanager.dto.UpdateEventRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.EventMemberRepository;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public Event createEvent(CreateEventRequest request, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerId));

        Event event = Event.builder()
                .name(request.name())
                .description(request.description())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .owner(owner)
                .status(EventStatus.DRAFT)
                .outdoor(request.outdoor() != null ? request.outdoor() : true)
                .boundaryGeoJson(request.boundaryGeoJson())
                .buildingPlanBase64(request.buildingPlanBase64())
                .build();

        event = eventRepository.save(event);

        // Automatycznie dodaj właściciela jako COORDINATOR
        EventMember ownerMember = EventMember.builder()
                .event(event)
                .user(owner)
                .role(UserRole.COORDINATOR)
                .build();

        eventMemberRepository.save(ownerMember);

        return event;
    }

    public Event getEvent(UUID eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
    }

    public List<Event> getEventsForUser(UUID userId) {
        // Zwracamy eventy, w których user jest członkiem
        List<EventMember> memberships = eventMemberRepository.findByUserId(userId);
        return memberships.stream()
                .map(EventMember::getEvent)
                .toList();
    }

    @Transactional
    public Event updateEvent(UUID eventId, UpdateEventRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (request.name() != null) {
            event.setName(request.name());
        }
        if (request.description() != null) {
            event.setDescription(request.description());
        }
        if (request.startDate() != null) {
            event.setStartDate(request.startDate());
        }
        if (request.endDate() != null) {
            event.setEndDate(request.endDate());
        }
        if (request.status() != null) {
            event.setStatus(request.status());
        }
        if (request.outdoor() != null) {
            event.setOutdoor(request.outdoor());
        }
        if (request.boundaryGeoJson() != null) {
            event.setBoundaryGeoJson(request.boundaryGeoJson());
        }
        if (request.buildingPlanBase64() != null) {
            event.setBuildingPlanBase64(request.buildingPlanBase64());
        }

        return eventRepository.save(event);
    }

    public List<EventMember> getEventMembers(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return eventMemberRepository.findByEventId(eventId);
    }

    public long getMemberCount(UUID eventId) {
        return eventMemberRepository.countByEventId(eventId);
    }

    @Transactional
    public EventMember updateMemberRole(UUID eventId, UUID userId, UserRole newRole) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in event: " + eventId + " for user: " + userId));

        member.setRole(newRole);
        return eventMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(UUID eventId, UUID userId) {
        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in event: " + eventId + " for user: " + userId));

        eventMemberRepository.delete(member);
    }
}
