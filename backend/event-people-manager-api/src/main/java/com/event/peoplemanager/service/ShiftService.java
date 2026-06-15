package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Shift;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.enums.ShiftStatus;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.ShiftRepository;
import com.event.peoplemanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.Zone;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.ZoneRepository;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final ZoneRepository zoneRepository;

    @Transactional
    public Shift checkIn(UUID userId, UUID eventId, UUID zoneId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        Zone zone = null;
        if (zoneId != null) {
            zone = zoneRepository.findById(zoneId)
                    .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));
        }

        // Zakończ wszystkie aktywne zmiany tego użytkownika (na wszelki wypadek)
        List<Shift> activeShifts = shiftRepository.findByUserIdAndStatus(userId, ShiftStatus.IN_PROGRESS);
        for (Shift active : activeShifts) {
            active.setStatus(ShiftStatus.COMPLETED);
            active.setEndTime(ZonedDateTime.now());
            shiftRepository.save(active);
        }

        Shift newShift = Shift.builder()
                .user(user)
                .event(event)
                .zone(zone)
                .status(ShiftStatus.IN_PROGRESS)
                .startTime(ZonedDateTime.now())
                .build();

        return shiftRepository.save(newShift);
    }

    @Transactional
    public Shift checkOut(UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));

        shift.setStatus(ShiftStatus.COMPLETED);
        shift.setEndTime(ZonedDateTime.now());
        
        return shiftRepository.save(shift);
    }

    public List<Shift> getShiftsForEvent(UUID eventId, ShiftStatus status, UUID userId, UUID zoneId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        List<Shift> shifts = shiftRepository.findByEventId(eventId);
        return shifts.stream()
                .filter(s -> status == null || s.getStatus() == status)
                .filter(s -> userId == null || s.getUser().getId().equals(userId))
                .filter(s -> zoneId == null || (s.getZone() != null && s.getZone().getId().equals(zoneId)))
                .toList();
    }

    public List<Shift> getActiveShiftsForEvent(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return shiftRepository.findByEventIdAndStatus(eventId, ShiftStatus.IN_PROGRESS);
    }
}
