package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.EventMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventMemberRepository extends JpaRepository<EventMember, UUID> {
    List<EventMember> findByEventId(UUID eventId);
    List<EventMember> findByUserId(UUID userId);
    Optional<EventMember> findByEventIdAndUserId(UUID eventId, UUID userId);
    boolean existsByEventIdAndUserId(UUID eventId, UUID userId);
    long countByEventId(UUID eventId);
}
