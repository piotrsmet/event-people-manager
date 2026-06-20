package com.event.peoplemanager.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "custom_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private String permissions = ""; // comma-separated e.g. "VIEW_MAP,WRITE_CHAT,SEND_SOS,REACT_STAFFING"
}
