package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.Incident;
import com.event.peoplemanager.domain.enums.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    List<Incident> findByStatus(IncidentStatus status);
    List<Incident> findByZoneId(UUID zoneId);
}
