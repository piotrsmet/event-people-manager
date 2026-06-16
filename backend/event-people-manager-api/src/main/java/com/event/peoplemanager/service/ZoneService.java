package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.Zone;
import com.event.peoplemanager.dto.CreateZoneRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final EventRepository eventRepository;

    @Transactional
    public Zone createZone(UUID eventId, CreateZoneRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        Zone zone = Zone.builder()
                .name(request.name())
                .description(request.description())
                .capacity(request.capacity())
                .boundaryGeoJson(request.boundaryGeoJson())
                .color(request.color() != null ? request.color() : "#3b82f6")
                .allowedRoles(request.allowedRoles() != null ? request.allowedRoles() : "")
                .accessTags(request.accessTags() != null ? request.accessTags() : "")
                .event(event)
                .build();

        return zoneRepository.save(zone);
    }

    public List<Zone> getZonesForEvent(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return zoneRepository.findByEventId(eventId);
    }

    @Transactional
    public Zone updateZone(UUID zoneId, CreateZoneRequest request) {
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));

        if (request.name() != null) zone.setName(request.name());
        if (request.description() != null) zone.setDescription(request.description());
        if (request.capacity() != null) zone.setCapacity(request.capacity());
        zone.setBoundaryGeoJson(request.boundaryGeoJson());
        if (request.color() != null) zone.setColor(request.color());
        if (request.allowedRoles() != null) zone.setAllowedRoles(request.allowedRoles());
        if (request.accessTags() != null) zone.setAccessTags(request.accessTags());

        return zoneRepository.save(zone);
    }

    @Transactional
    public void deleteZone(UUID zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResourceNotFoundException("Zone not found: " + zoneId);
        }
        zoneRepository.deleteById(zoneId);
    }
}
