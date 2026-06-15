package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.InviteToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InviteTokenRepository extends JpaRepository<InviteToken, UUID> {
    Optional<InviteToken> findByCode(String code);
    List<InviteToken> findByEventId(UUID eventId);
}
