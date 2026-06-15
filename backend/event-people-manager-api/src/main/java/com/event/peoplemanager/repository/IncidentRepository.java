package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.Incident;
import com.event.peoplemanager.domain.enums.IncidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {
    List<Incident> findByStatus(IncidentStatus status);
    List<Incident> findByZoneId(UUID zoneId);
    Page<Incident> findByEventId(UUID eventId, Pageable pageable);
    
    long countByEventIdAndStatus(UUID eventId, IncidentStatus status);

    @Query("SELECT COUNT(i) FROM Incident i WHERE i.event.id = :eventId AND i.status = :status AND i.updatedAt >= :since")
    long countIncidentsByEventIdAndStatusAndUpdatedAtAfter(
            @Param("eventId") UUID eventId,
            @Param("status") IncidentStatus status,
            @Param("since") ZonedDateTime since
    );
}
