package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.LocationLogRequest;
import com.event.peoplemanager.dto.response.LocationLogResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
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
    private final ResponseMapper responseMapper;

    @PostMapping
    public ResponseEntity<LocationLogResponse> saveLocation(@RequestBody LocationLogRequest request) {
        var log = locationLogService.saveLocation(request);
        return ResponseEntity.ok(responseMapper.toLocationLogResponse(log));
    }
}
