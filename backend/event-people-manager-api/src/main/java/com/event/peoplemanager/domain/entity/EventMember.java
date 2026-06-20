package com.event.peoplemanager.domain.entity;

import com.event.peoplemanager.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "event_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"event_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.VOLUNTEER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_role_id")
    private CustomRole customRole;

    @Column(name = "joined_at")
    @Builder.Default
    private ZonedDateTime joinedAt = ZonedDateTime.now();
}
