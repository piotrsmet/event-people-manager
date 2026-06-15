package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.CreateZoneRequest;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.dto.response.ZoneResponse;
import com.event.peoplemanager.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;
    private final ResponseMapper responseMapper;

    @PostMapping("/events/{eventId}/zones")
    public ResponseEntity<ZoneResponse> createZone(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateZoneRequest request
    ) {
        var zone = zoneService.createZone(eventId, request);
        return ResponseEntity.ok(responseMapper.toZoneResponse(zone));
    }

    @GetMapping("/events/{eventId}/zones")
    public ResponseEntity<List<ZoneResponse>> getZones(@PathVariable UUID eventId) {
        var zones = zoneService.getZonesForEvent(eventId);
        return ResponseEntity.ok(zones.stream().map(responseMapper::toZoneResponse).toList());
    }

    @PutMapping("/zones/{zoneId}")
    public ResponseEntity<ZoneResponse> updateZone(
            @PathVariable UUID zoneId,
            @Valid @RequestBody CreateZoneRequest request
    ) {
        var zone = zoneService.updateZone(zoneId, request);
        return ResponseEntity.ok(responseMapper.toZoneResponse(zone));
    }

    @DeleteMapping("/zones/{zoneId}")
    public ResponseEntity<Void> deleteZone(@PathVariable UUID zoneId) {
        zoneService.deleteZone(zoneId);
        return ResponseEntity.noContent().build();
    }
}
