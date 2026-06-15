package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.response.ShiftResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.event.peoplemanager.domain.enums.ShiftStatus;

import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;
    private final ResponseMapper responseMapper;

    @PostMapping("/shifts/check-in")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<ShiftResponse> checkIn(
            @RequestParam UUID userId,
            @RequestParam UUID eventId,
            @RequestParam(required = false) UUID zoneId
    ) {
        var shift = shiftService.checkIn(userId, eventId, zoneId);
        return ResponseEntity.ok(responseMapper.toShiftResponse(shift));
    }

    @PostMapping("/shifts/{shiftId}/check-out")
    @PreAuthorize("@eventSecurity.canManageShift(#shiftId)")
    public ResponseEntity<ShiftResponse> checkOut(@PathVariable UUID shiftId) {
        var shift = shiftService.checkOut(shiftId);
        return ResponseEntity.ok(responseMapper.toShiftResponse(shift));
    }

    @GetMapping("/events/{eventId}/shifts")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<ShiftResponse>> getShifts(
            @PathVariable UUID eventId,
            @RequestParam(required = false) ShiftStatus status,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID zoneId
    ) {
        var shifts = shiftService.getShiftsForEvent(eventId, status, userId, zoneId);
        return ResponseEntity.ok(shifts.stream().map(responseMapper::toShiftResponse).toList());
    }

    @GetMapping("/events/{eventId}/shifts/active")
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<ShiftResponse>> getActiveShifts(@PathVariable UUID eventId) {
        var shifts = shiftService.getActiveShiftsForEvent(eventId);
        return ResponseEntity.ok(shifts.stream().map(responseMapper::toShiftResponse).toList());
    }
}
