package com.event.peoplemanager.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "staffing_responses", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"staffing_request_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffingResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staffing_request_id", nullable = false)
    private StaffingRequest staffingRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}
