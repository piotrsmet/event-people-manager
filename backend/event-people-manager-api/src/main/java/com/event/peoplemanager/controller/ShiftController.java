package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.response.ShiftResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
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
    private final ResponseMapper responseMapper;

    @PostMapping("/check-in")
    public ResponseEntity<ShiftResponse> checkIn(@RequestParam UUID userId) {
        var shift = shiftService.checkIn(userId);
        return ResponseEntity.ok(responseMapper.toShiftResponse(shift));
    }

    @PostMapping("/{shiftId}/check-out")
    public ResponseEntity<ShiftResponse> checkOut(@PathVariable UUID shiftId) {
        var shift = shiftService.checkOut(shiftId);
        return ResponseEntity.ok(responseMapper.toShiftResponse(shift));
    }
}
