package com.shiftcart.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Historique : chaque changement de statut (qui, quand, depuis quel statut). */
@Entity
@Table(name = "order_event")
public class OrderEvent {

    public static final String ACTOR_CUSTOMER = "customer";
    public static final String ACTOR_SYSTEM = "system";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private OrderStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false)
    private OrderStatus toStatus;

    @Column(nullable = false)
    private String actor;

    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected OrderEvent() {}

    public OrderEvent(Long orderId, OrderStatus fromStatus, OrderStatus toStatus, String actor, String note,
            Instant createdAt) {
        this.orderId = orderId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.actor = actor;
        this.note = note;
        this.createdAt = createdAt;
    }

    public static String agentActor(long userId) {
        return "agent:" + userId;
    }

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public OrderStatus getFromStatus() {
        return fromStatus;
    }

    public OrderStatus getToStatus() {
        return toStatus;
    }

    public String getActor() {
        return actor;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
