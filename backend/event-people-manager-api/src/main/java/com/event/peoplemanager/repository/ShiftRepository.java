package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.Shift;
import com.event.peoplemanager.domain.enums.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, UUID> {
    List<Shift> findByUserIdAndStatus(UUID userId, ShiftStatus status);
    List<Shift> findByZoneId(UUID zoneId);
    List<Shift> findByEventId(UUID eventId);
    List<Shift> findByEventIdAndStatus(UUID eventId, ShiftStatus status);
    long countByEventIdAndStatus(UUID eventId, ShiftStatus status);
}
