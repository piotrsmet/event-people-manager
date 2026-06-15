package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.StrategicPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StrategicPointRepository extends JpaRepository<StrategicPoint, UUID> {
    List<StrategicPoint> findByEventId(UUID eventId);
}
