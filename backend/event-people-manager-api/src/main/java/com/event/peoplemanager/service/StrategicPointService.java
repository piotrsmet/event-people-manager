package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.StrategicPoint;
import com.event.peoplemanager.dto.StrategicPointRequest;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.StrategicPointRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StrategicPointService {

    private final StrategicPointRepository strategicPointRepository;
    private final EventRepository eventRepository;

    public List<StrategicPoint> getStrategicPointsForEvent(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new IllegalArgumentException("Event not found with ID: " + eventId);
        }
        return strategicPointRepository.findByEventId(eventId);
    }

    @Transactional
    public StrategicPoint createStrategicPoint(UUID eventId, StrategicPointRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with ID: " + eventId));

        StrategicPoint point = StrategicPoint.builder()
                .event(event)
                .name(request.name())
                .type(request.type())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .xRatio(request.xRatio())
                .yRatio(request.yRatio())
                .build();

        return strategicPointRepository.save(point);
    }

    @Transactional
    public void deleteStrategicPoint(UUID pointId) {
        if (!strategicPointRepository.existsById(pointId)) {
            throw new IllegalArgumentException("Strategic point not found with ID: " + pointId);
        }
        strategicPointRepository.deleteById(pointId);
    }
}
