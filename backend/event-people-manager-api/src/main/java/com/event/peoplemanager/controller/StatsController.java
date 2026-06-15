package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.response.EventStatsResponse;
import com.event.peoplemanager.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/events/{eventId}/stats")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR', 'SECURITY')")
    public ResponseEntity<EventStatsResponse> getEventStats(@PathVariable UUID eventId) {
        var stats = statsService.getEventStats(eventId);
        return ResponseEntity.ok(stats);
    }
}
