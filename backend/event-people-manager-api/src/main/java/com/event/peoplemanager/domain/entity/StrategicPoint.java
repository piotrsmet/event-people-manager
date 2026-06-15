package com.event.peoplemanager.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "strategic_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StrategicPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // e.g. MEDICAL, SECURITY, ENTRANCE, STAGE, INFO, OTHER

    // Dla wydarzeń na wolnym powietrzu (GPS)
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    // Dla wydarzeń w budynkach (rzuty/plany)
    @Column(name = "x_ratio")
    private Double xRatio;

    @Column(name = "y_ratio")
    private Double yRatio;
}
