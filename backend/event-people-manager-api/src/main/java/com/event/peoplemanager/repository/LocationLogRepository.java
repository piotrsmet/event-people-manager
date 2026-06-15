package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.LocationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LocationLogRepository extends JpaRepository<LocationLog, UUID> {
    List<LocationLog> findByUserId(UUID userId);
    List<LocationLog> findByShiftId(UUID shiftId);
    java.util.Optional<LocationLog> findFirstByUserIdOrderByTimestampDesc(UUID userId);
}
