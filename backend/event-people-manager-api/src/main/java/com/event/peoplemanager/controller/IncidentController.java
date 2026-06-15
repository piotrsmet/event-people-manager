package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.IncidentRequest;
import com.event.peoplemanager.dto.response.IncidentResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;
    private final ResponseMapper responseMapper;

    @PostMapping
    public ResponseEntity<IncidentResponse> reportIncident(@Valid @RequestBody IncidentRequest request) {
        var incident = incidentService.reportIncident(request);
        return ResponseEntity.ok(responseMapper.toIncidentResponse(incident));
    }

    @PostMapping("/{incidentId}/resolve")
    public ResponseEntity<IncidentResponse> resolveIncident(@PathVariable UUID incidentId) {
        var incident = incidentService.resolveIncident(incidentId);
        return ResponseEntity.ok(responseMapper.toIncidentResponse(incident));
    }

    @GetMapping("/active")
    public ResponseEntity<List<IncidentResponse>> getActiveIncidents() {
        var incidents = incidentService.getActiveIncidents();
        return ResponseEntity.ok(incidents.stream().map(responseMapper::toIncidentResponse).toList());
    }
}
