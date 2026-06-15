package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.enums.IncidentStatus;
import com.event.peoplemanager.domain.enums.ShiftStatus;
import com.event.peoplemanager.dto.response.EventStatsResponse;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final EventRepository eventRepository;
    private final EventMemberRepository eventMemberRepository;
    private final ShiftRepository shiftRepository;
    private final IncidentRepository incidentRepository;
    private final ZoneRepository zoneRepository;

    public EventStatsResponse getEventStats(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }

        long totalMembers = eventMemberRepository.countByEventId(eventId);
        long activeShifts = shiftRepository.countByEventIdAndStatus(eventId, ShiftStatus.IN_PROGRESS);
        long openIncidents = incidentRepository.countByEventIdAndStatus(eventId, IncidentStatus.OPEN);

        ZonedDateTime startOfToday = LocalDate.now().atStartOfDay(ZoneId.systemDefault());
        long resolvedToday = incidentRepository.countIncidentsByEventIdAndStatusAndUpdatedAtAfter(
                eventId,
                IncidentStatus.RESOLVED,
                startOfToday
        );

        long totalZones = zoneRepository.countByEventId(eventId);

        return new EventStatsResponse(
                totalMembers,
                activeShifts,
                openIncidents,
                resolvedToday,
                totalZones
        );
    }
}
