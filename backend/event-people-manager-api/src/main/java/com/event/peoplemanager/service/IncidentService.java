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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final ZoneRepository zoneRepository;

    @Transactional
    public Incident reportIncident(IncidentRequest request) {
        User reporter = userRepository.findById(request.reporterId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.reporterId()));

        Zone zone = null;
        if (request.zoneId() != null) {
            zone = zoneRepository.findById(request.zoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + request.zoneId()));
        }

        Incident incident = Incident.builder()
                .reporter(reporter)
                .zone(zone)
                .type(request.type())
                .description(request.description())
                .locationLat(request.locationLat())
                .locationLng(request.locationLng())
                .status(IncidentStatus.OPEN)
                .build();

        return incidentRepository.save(incident);
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
}
