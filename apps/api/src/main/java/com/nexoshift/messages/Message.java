package com.nexoshift.messages;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Message WhatsApp sortant ({@code OUT}) ou entrant ({@code IN}). */
@Entity
@Table(name = "message")
public class Message {

    public static final String OUT = "OUT";
    public static final String IN = "IN";

    /** Statuts : SENT · FAILED · SIMULATED (sortants), RECEIVED (entrants), puis DELIVERED / READ via webhook. */
    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_SIMULATED = "SIMULATED";
    public static final String STATUS_RECEIVED = "RECEIVED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "phone_e164")
    private String phoneE164;

    @Column(nullable = false)
    private String direction;

    @Column(nullable = false)
    private String channel = "whatsapp";

    private String tone;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "provider_message_id")
    private String providerMessageId;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Message() {}

    public Message(Long orderId, String phoneE164, String direction, String tone, String body, String status,
            String providerMessageId, Instant createdAt) {
        this.orderId = orderId;
        this.phoneE164 = phoneE164;
        this.direction = direction;
        this.tone = tone;
        this.body = body;
        this.status = status;
        this.providerMessageId = providerMessageId;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getPhoneE164() {
        return phoneE164;
    }

    public String getDirection() {
        return direction;
    }

    public String getChannel() {
        return channel;
    }

    public String getTone() {
        return tone;
    }

    public String getBody() {
        return body;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
