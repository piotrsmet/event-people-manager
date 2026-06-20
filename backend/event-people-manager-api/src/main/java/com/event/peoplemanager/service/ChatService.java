package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.ChatMessage;
import com.event.peoplemanager.domain.entity.Event;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.dto.ChatMessageRequest;
import com.event.peoplemanager.exception.ResourceNotFoundException;
import com.event.peoplemanager.repository.ChatMessageRepository;
import com.event.peoplemanager.repository.EventRepository;
import com.event.peoplemanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessage saveMessage(UUID eventId, UUID senderId, ChatMessageRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Sender not found: " + senderId));

        User recipient = null;
        if (request.recipientId() != null) {
            recipient = userRepository.findById(request.recipientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Recipient not found: " + request.recipientId()));
        }

        ChatMessage message = ChatMessage.builder()
                .event(event)
                .sender(sender)
                .recipient(recipient)
                .channel(request.channel())
                .content(request.content())
                .build();

        return chatMessageRepository.save(message);
    }

    public List<ChatMessage> getGeneralChatHistory(UUID eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return chatMessageRepository.findByEventIdAndChannelAndRecipientIsNullOrderByCreatedAtAsc(eventId, "GENERAL");
    }

    public List<ChatMessage> getCoordinatorThreadHistory(UUID eventId, UUID volunteerId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        if (!userRepository.existsById(volunteerId)) {
            throw new ResourceNotFoundException("User not found: " + volunteerId);
        }
        return chatMessageRepository.findCoordinatorThread(eventId, volunteerId);
    }
}
