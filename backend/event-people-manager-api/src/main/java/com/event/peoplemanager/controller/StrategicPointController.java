package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.StrategicPointRequest;
import com.event.peoplemanager.dto.response.StrategicPointResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.StrategicPointService;
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
public class StrategicPointController {

    private final StrategicPointService strategicPointService;
    private final ResponseMapper responseMapper;

    @PostMapping("/events/{eventId}/strategic-points")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<StrategicPointResponse> createStrategicPoint(
            @PathVariable UUID eventId,
            @Valid @RequestBody StrategicPointRequest request
    ) {
        var point = strategicPointService.createStrategicPoint(eventId, request);
        return ResponseEntity.ok(responseMapper.toStrategicPointResponse(point));
    }

    @GetMapping("/events/{eventId}/strategic-points")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<StrategicPointResponse>> getStrategicPoints(@PathVariable UUID eventId) {
        var points = strategicPointService.getStrategicPointsForEvent(eventId);
        return ResponseEntity.ok(points.stream().map(responseMapper::toStrategicPointResponse).toList());
    }

    @DeleteMapping("/strategic-points/{pointId}")
    @PreAuthorize("@eventSecurity.canManageStrategicPoint(#pointId)")
    public ResponseEntity<Void> deleteStrategicPoint(@PathVariable UUID pointId) {
        strategicPointService.deleteStrategicPoint(pointId);
        return ResponseEntity.noContent().build();
    }
}
