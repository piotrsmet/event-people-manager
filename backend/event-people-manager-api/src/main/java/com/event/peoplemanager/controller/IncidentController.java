package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.Incident;
import com.event.peoplemanager.dto.IncidentRequest;
import com.event.peoplemanager.service.IncidentService;
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

    @PostMapping
    public ResponseEntity<Incident> reportIncident(@RequestBody IncidentRequest request) {
        return ResponseEntity.ok(incidentService.reportIncident(request));
    }

    @PostMapping("/{incidentId}/resolve")
    public ResponseEntity<Incident> resolveIncident(@PathVariable UUID incidentId) {
        return ResponseEntity.ok(incidentService.resolveIncident(incidentId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<Incident>> getActiveIncidents() {
        return ResponseEntity.ok(incidentService.getActiveIncidents());
    }
}
