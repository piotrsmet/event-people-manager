package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.CustomRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CustomRoleRepository extends JpaRepository<CustomRole, UUID> {
    List<CustomRole> findByEventId(UUID eventId);
}
