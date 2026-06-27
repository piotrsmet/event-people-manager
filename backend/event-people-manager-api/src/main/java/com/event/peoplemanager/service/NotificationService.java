package com.event.peoplemanager.service;

import com.event.peoplemanager.domain.entity.Notification;
import com.event.peoplemanager.domain.entity.User;
import com.event.peoplemanager.domain.entity.EventMember;
import com.event.peoplemanager.repository.NotificationRepository;
import com.event.peoplemanager.repository.EventMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EventMemberRepository eventMemberRepository;

    @Transactional
    public Notification createNotification(UUID eventId, User user, String title, String message, String type) {
        Notification notification = Notification.builder()
                .eventId(eventId)
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    @Transactional
    public void notifyAllEventMembersExcept(UUID eventId, UUID senderUserId, String title, String message, String type) {
        List<EventMember> members = eventMemberRepository.findByEventId(eventId);
        for (EventMember member : members) {
            if (!member.getUser().getId().equals(senderUserId)) {
                createNotification(eventId, member.getUser(), title, message, type);
            }
        }
    }

    @Transactional
    public void notifyAllCoordinators(UUID eventId, String title, String message, String type) {
        List<EventMember> members = eventMemberRepository.findByEventId(eventId);
        for (EventMember member : members) {
            if (member.getRole() != null && "COORDINATOR".equals(member.getRole().name())) {
                createNotification(eventId, member.getUser(), title, message, type);
            }
        }
    }

    public List<Notification> getNotificationsForUser(UUID eventId, UUID userId) {
        return notificationRepository.findByEventIdAndUserIdOrderByCreatedAtDesc(eventId, userId);
    }

    @Transactional
    public Notification markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found: " + notificationId));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }
}
