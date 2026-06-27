package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Incident;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.entity.Zone;
import com.event.peoplemanager.domain.enums.IncidentStatus;
import com.event.peoplemanager.dto.IncidentRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.IncidentRepository;
import com.event.peoplemanager.repository.UserRepository;
import com.event.peoplemanager.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.repository.EventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final ZoneRepository zoneRepository;
    private final EventRepository eventRepository;
    private final ResponseMapper responseMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Transactional
    public Incident reportIncident(IncidentRequest request) {
        User reporter = userRepository.findById(request.reporterId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.reporterId()));

        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.eventId()));

        Zone zone = null;
        if (request.zoneId() != null) {
            zone = zoneRepository.findById(request.zoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + request.zoneId()));
        }

        Incident incident = Incident.builder()
                .reporter(reporter)
                .event(event)
                .zone(zone)
                .type(request.type())
                .description(request.description())
                .locationLat(request.locationLat())
                .locationLng(request.locationLng())
                .status(IncidentStatus.OPEN)
                .build();

        incident = incidentRepository.save(incident);
        messagingTemplate.convertAndSend("/topic/incidents", responseMapper.toIncidentResponse(incident));

        // Wyślij powiadomienie do koordynatorów
        try {
            String title = "ALARM SOS - " + request.type();
            String msg = "Zgłosił: " + reporter.getUsername();
            if (zone != null) {
                msg += " w strefie " + zone.getName();
            }
            if (request.description() != null && !request.description().trim().isEmpty()) {
                msg += ". Opis: " + request.description();
            }
            notificationService.notifyAllCoordinators(request.eventId(), title, msg, "SOS");
        } catch (Exception e) {
            e.printStackTrace();
        }

        return incident;
    }

    @Transactional
    public Incident resolveIncident(UUID incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + incidentId));

        incident.setStatus(IncidentStatus.RESOLVED);
        return incidentRepository.save(incident);
    }

    public List<Incident> getActiveIncidents() {
        return incidentRepository.findByStatus(IncidentStatus.OPEN);
    }

    public Page<Incident> getIncidentsForEvent(UUID eventId, Pageable pageable) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return incidentRepository.findByEventId(eventId, pageable);
    }
}
