package com.event.peoplemanager.repository;

import com.event.peoplemanager.domain.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByEventIdAndChannelAndRecipientIsNullOrderByCreatedAtAsc(UUID eventId, String channel);

    @Query("SELECT m FROM ChatMessage m WHERE m.event.id = :eventId AND m.channel = 'COORDINATORS' AND (" +
           "(m.sender.id = :volunteerId AND m.recipient IS NULL) OR " +
           "(m.recipient.id = :volunteerId)" +
           ") ORDER BY m.createdAt ASC")
    List<ChatMessage> findCoordinatorThread(
            @Param("eventId") UUID eventId,
            @Param("volunteerId") UUID volunteerId
    );
}
