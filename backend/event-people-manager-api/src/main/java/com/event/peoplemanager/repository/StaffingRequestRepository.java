package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.StaffingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffingRequestRepository extends JpaRepository<StaffingRequest, UUID> {
    List<StaffingRequest> findByEventIdOrderByCreatedAtDesc(UUID eventId);
    List<StaffingRequest> findByEventIdAndStatusOrderByCreatedAtDesc(UUID eventId, String status);
}
