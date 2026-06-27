package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.*;
import com.event.peoplemanager.dto.CreateStaffingRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StaffingService {

    private final StaffingRequestRepository staffingRequestRepository;
    private final StaffingResponseRepository staffingResponseRepository;
    private final EventRepository eventRepository;
    private final ZoneRepository zoneRepository;
    private final StrategicPointRepository strategicPointRepository;
    private final UserRepository userRepository;
    private final EventMemberRepository eventMemberRepository;
    private final ShiftRepository shiftRepository;
    private final NotificationService notificationService;

    @Transactional
    public StaffingRequest createStaffingRequest(UUID eventId, CreateStaffingRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        Zone zone = null;
        if (request.zoneId() != null) {
            zone = zoneRepository.findById(request.zoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + request.zoneId()));
        }

        StrategicPoint sp = null;
        if (request.strategicPointId() != null) {
            sp = strategicPointRepository.findById(request.strategicPointId())
                    .orElseThrow(() -> new ResourceNotFoundException("Strategic point not found: " + request.strategicPointId()));
        }

        StaffingRequest req = StaffingRequest.builder()
                .event(event)
                .zone(zone)
                .strategicPoint(sp)
                .countNeeded(request.countNeeded())
                .description(request.description())
                .status("OPEN")
                .build();

        StaffingRequest savedReq = staffingRequestRepository.save(req);

        // Wyślij powiadomienie
        try {
            String placeName = zone != null ? "strefie " + zone.getName() : "punkcie " + sp.getName();
            String title = "Nowe zapotrzebowanie na ludzi";
            String msg = "Potrzebne wsparcie (" + request.countNeeded() + " os.) w " + placeName + ".";
            if (request.description() != null && !request.description().trim().isEmpty()) {
                msg += " Opis: " + request.description();
            }
            notificationService.notifyAllEventMembersExcept(eventId, UUID.randomUUID(), title, msg, "STAFFING");
        } catch (Exception e) {
            e.printStackTrace();
        }

        return savedReq;
    }

    public List<StaffingRequest> getStaffingRequests(UUID eventId) {
        return staffingRequestRepository.findByEventIdOrderByCreatedAtDesc(eventId);
    }

    @Transactional
    public StaffingResponse reactToStaffingRequest(UUID eventId, UUID requestId, UUID userId) {
        StaffingRequest req = staffingRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Staffing request not found: " + requestId));

        if (!req.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Staffing request does not belong to this event");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        EventMember member = eventMemberRepository.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this event"));

        // Check custom permission
        if (member.getCustomRole() != null) {
            String perms = member.getCustomRole().getPermissions();
            boolean canReact = perms != null && Arrays.asList(perms.split(",")).contains("REACT_STAFFING");
            if (!canReact) {
                throw new IllegalStateException("Twoja rola nie posiada uprawnień do reagowania na zapotrzebowania.");
            }
        }

        // Check if response already exists
        var existing = staffingResponseRepository.findByStaffingRequestIdAndUserId(requestId, userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        StaffingResponse response = StaffingResponse.builder()
                .staffingRequest(req)
                .user(user)
                .build();

        response = staffingResponseRepository.save(response);

        // Optional: Automatycznie przydziel podwładnego do strefy/punktu jeśli ma aktywny shift
        var activeShifts = shiftRepository.findByUserIdAndStatus(userId, com.event.peoplemanager.domain.enums.ShiftStatus.IN_PROGRESS).stream()
                .filter(s -> s.getEvent().getId().equals(eventId))
                .toList();

        if (!activeShifts.isEmpty()) {
            for (Shift shift : activeShifts) {
                shift.setZone(req.getZone());
                shift.setStrategicPoint(req.getStrategicPoint());
                shiftRepository.save(shift);
            }
        }

        // Auto-fill: zamknij zapotrzebowanie gdy osiągnięto wymaganą liczbę zgłoszeń
        long responseCount = staffingResponseRepository.countByStaffingRequestId(requestId);
        if (responseCount >= req.getCountNeeded() && "OPEN".equals(req.getStatus())) {
            req.setStatus("FILLED");
            staffingRequestRepository.save(req);
        }

        return response;
    }

    public List<StaffingResponse> getResponses(UUID eventId, UUID requestId) {
        StaffingRequest req = staffingRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Staffing request not found: " + requestId));

        if (!req.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Staffing request does not belong to this event");
        }

        return staffingResponseRepository.findByStaffingRequestId(req.getId());
    }

    @Transactional
    public StaffingRequest updateStatus(UUID eventId, UUID requestId, String status) {
        StaffingRequest req = staffingRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Staffing request not found: " + requestId));

        if (!req.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Staffing request does not belong to this event");
        }

        req.setStatus(status);
        return staffingRequestRepository.save(req);
    }
}
