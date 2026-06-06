package com.event.peoplemanager.controller;

import com.event.peoplemanager.domain.entity.Shift;
import com.event.peoplemanager.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    @PostMapping("/check-in")
    public ResponseEntity<Shift> checkIn(@RequestParam UUID userId) {
        return ResponseEntity.ok(shiftService.checkIn(userId));
    }

    @PostMapping("/{shiftId}/check-out")
    public ResponseEntity<Shift> checkOut(@PathVariable UUID shiftId) {
        return ResponseEntity.ok(shiftService.checkOut(shiftId));
    }
}
