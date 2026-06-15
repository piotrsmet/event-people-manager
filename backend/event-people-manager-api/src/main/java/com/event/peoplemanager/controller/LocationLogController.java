package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.LocationLogRequest;
import com.event.peoplemanager.dto.response.LocationLogResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.LocationLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LocationLogController {

    private final LocationLogService locationLogService;
    private final ResponseMapper responseMapper;

    @PostMapping("/locations")
    public ResponseEntity<LocationLogResponse> saveLocation(@Valid @RequestBody LocationLogRequest request) {
        var log = locationLogService.saveLocation(request);
        return ResponseEntity.ok(responseMapper.toLocationLogResponse(log));
    }

    @GetMapping("/events/{eventId}/locations/latest")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<LocationLogResponse>> getLatestLocations(@PathVariable UUID eventId) {
        var logs = locationLogService.getLatestLocationsForEvent(eventId);
        return ResponseEntity.ok(logs.stream().map(responseMapper::toLocationLogResponse).toList());
    }
}
