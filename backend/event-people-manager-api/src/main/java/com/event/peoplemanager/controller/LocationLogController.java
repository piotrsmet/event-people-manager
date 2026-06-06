package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.LocationLog;
import com.event.peoplemanager.dto.LocationLogRequest;
import com.event.peoplemanager.service.LocationLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/locations")
@RequiredArgsConstructor
public class LocationLogController {

    private final LocationLogService locationLogService;

    @PostMapping
    public ResponseEntity<LocationLog> saveLocation(@RequestBody LocationLogRequest request) {
        return ResponseEntity.ok(locationLogService.saveLocation(request));
    }
}
