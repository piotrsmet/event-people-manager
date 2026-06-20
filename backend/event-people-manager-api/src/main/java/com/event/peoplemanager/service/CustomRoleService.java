package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.CustomRole;
import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.dto.CreateCustomRoleRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.CustomRoleRepository;
import com.event.peoplemanager.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomRoleService {

    private final CustomRoleRepository customRoleRepository;
    private final EventRepository eventRepository;

    @Transactional
    public CustomRole createCustomRole(UUID eventId, CreateCustomRoleRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        CustomRole customRole = CustomRole.builder()
                .event(event)
                .name(request.name())
                .permissions(request.permissions() != null ? request.permissions() : "")
                .build();

        return customRoleRepository.save(customRole);
    }

    public List<CustomRole> getCustomRoles(UUID eventId) {
        return customRoleRepository.findByEventId(eventId);
    }

    @Transactional
    public void deleteCustomRole(UUID eventId, UUID roleId) {
        CustomRole role = customRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Custom role not found: " + roleId));

        if (!role.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Role does not belong to this event");
        }

        customRoleRepository.delete(role);
    }
}
