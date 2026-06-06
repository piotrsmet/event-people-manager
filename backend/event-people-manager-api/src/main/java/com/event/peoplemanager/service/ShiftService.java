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

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShiftService {

    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    @Transactional
    public Shift checkIn(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        // Zakończ wszystkie aktywne zmiany tego użytkownika (na wszelki wypadek)
        List<Shift> activeShifts = shiftRepository.findByUserIdAndStatus(userId, ShiftStatus.IN_PROGRESS);
        for (Shift active : activeShifts) {
            active.setStatus(ShiftStatus.COMPLETED);
            active.setEndTime(ZonedDateTime.now());
            shiftRepository.save(active);
        }

        Shift newShift = Shift.builder()
                .user(user)
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
}
