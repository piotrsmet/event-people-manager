package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, UUID> {
    List<Zone> findByEventId(UUID eventId);
    long countByEventId(UUID eventId);
}
