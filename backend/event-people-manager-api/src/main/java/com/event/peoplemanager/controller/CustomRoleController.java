package com.event.peoplemanager.controller;

import com.event.peoplemanager.dto.CreateCustomRoleRequest;
import com.event.peoplemanager.dto.response.CustomRoleResponse;
import com.event.peoplemanager.dto.response.ResponseMapper;
import com.event.peoplemanager.service.CustomRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events/{eventId}/custom-roles")
@RequiredArgsConstructor
public class CustomRoleController {

    private final CustomRoleService customRoleService;
    private final ResponseMapper responseMapper;

    @PostMapping
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<CustomRoleResponse> createCustomRole(
            @PathVariable UUID eventId,
            @Valid @RequestBody CreateCustomRoleRequest request
    ) {
        var created = customRoleService.createCustomRole(eventId, request);
        return ResponseEntity.ok(responseMapper.toCustomRoleResponse(created));
    }

    @GetMapping
    @PreAuthorize("@eventSecurity.isEventMember(#eventId)")
    public ResponseEntity<List<CustomRoleResponse>> getCustomRoles(
            @PathVariable UUID eventId
    ) {
        var roles = customRoleService.getCustomRoles(eventId);
        return ResponseEntity.ok(roles.stream().map(responseMapper::toCustomRoleResponse).toList());
    }

    @DeleteMapping("/{roleId}")
    @PreAuthorize("@eventSecurity.hasEventRole(#eventId, 'COORDINATOR')")
    public ResponseEntity<Void> deleteCustomRole(
            @PathVariable UUID eventId,
            @PathVariable UUID roleId
    ) {
        customRoleService.deleteCustomRole(eventId, roleId);
        return ResponseEntity.noContent().build();
    }
}
