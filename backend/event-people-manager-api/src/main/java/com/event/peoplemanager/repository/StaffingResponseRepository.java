package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.StaffingResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffingResponseRepository extends JpaRepository<StaffingResponse, UUID> {
    List<StaffingResponse> findByStaffingRequestId(UUID staffingRequestId);
    Optional<StaffingResponse> findByStaffingRequestIdAndUserId(UUID staffingRequestId, UUID userId);
    boolean existsByStaffingRequestIdAndUserId(UUID staffingRequestId, UUID userId);
    long countByStaffingRequestId(UUID staffingRequestId);
}
