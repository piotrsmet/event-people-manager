package com.event.peoplemanager.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "staffing_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "strategic_point_id")
    private StrategicPoint strategicPoint;

    @Column(name = "count_needed", nullable = false)
    private Integer countNeeded;

    private String description;

    @Column(nullable = false)
    @Builder.Default
    private String status = "OPEN"; // OPEN, FILLED, CANCELLED

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}
