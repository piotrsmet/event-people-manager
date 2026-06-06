package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.LocationLog;
import com.event.peoplemanager.domain.entity.Shift;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.LocationLogRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.LocationLogRepository;
import com.event.peoplemanager.repository.ShiftRepository;
import com.event.peoplemanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LocationLogService {

    private final LocationLogRepository locationLogRepository;
    private final UserRepository userRepository;
    private final ShiftRepository shiftRepository;

    @Transactional
    public LocationLog saveLocation(LocationLogRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.userId()));

        Shift shift = null;
        if (request.shiftId() != null) {
            shift = shiftRepository.findById(request.shiftId())
                    .orElse(null); // Zmiana może być null, jeśli to np. kierownik, który nie odbija zmiany
        }

        LocationLog log = LocationLog.builder()
                .user(user)
                .shift(shift)
                .latitude(request.latitude())
                .longitude(request.longitude())
                .timestamp(ZonedDateTime.now())
                .build();

        return locationLogRepository.save(log);
    }
}
