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
import com.event.peoplemanager.domain.entity.StrategicPoint;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.ZoneRepository;

import com.event.peoplemanager.repository.StrategicPointRepository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final ZoneRepository zoneRepository;
    private final StrategicPointRepository strategicPointRepository;
    private final NotificationService notificationService;

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

    @Transactional
    public Shift assignShift(UUID eventId, UUID shiftId, UUID zoneId, UUID strategicPointId) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found: " + shiftId));

        if (!shift.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Shift does not belong to this event");
        }

        String notifMsg = "";
        if (zoneId != null) {
            Zone zone = zoneRepository.findById(zoneId)
                    .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));
            shift.setZone(zone);
            shift.setStrategicPoint(null); // Clear point when zone is set
            notifMsg = "Koordynator przydzielił Cię do strefy: " + zone.getName();
        } else if (strategicPointId != null) {
            StrategicPoint sp = strategicPointRepository.findById(strategicPointId)
                    .orElseThrow(() -> new ResourceNotFoundException("Strategic point not found: " + strategicPointId));
            shift.setStrategicPoint(sp);
            shift.setZone(null); // Clear zone when point is set
            notifMsg = "Koordynator przydzielił Cię do punktu strategicznego: " + sp.getName();
        } else {
            shift.setZone(null);
            shift.setStrategicPoint(null);
            notifMsg = "Koordynator wyczyścił Twój przydział strefowy.";
        }

        Shift savedShift = shiftRepository.save(shift);

        try {
            notificationService.createNotification(
                    eventId,
                    savedShift.getUser(),
                    "Zmiana przydziału strefy",
                    notifMsg,
                    "ASSIGNMENT"
            );
        } catch (Exception e) {
            e.printStackTrace();
        }

        return savedShift;
    }
}
