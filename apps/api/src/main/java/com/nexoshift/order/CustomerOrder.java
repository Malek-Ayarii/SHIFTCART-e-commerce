package com.nexoshift.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** Une commande COD. Table {@code customer_order} ("order" est un mot réservé SQL). */
@Entity
@Table(name = "customer_order")
public class CustomerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, updatable = false)
    private String ref;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "amount_millimes", nullable = false)
    private long amountMillimes;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "phone_e164", nullable = false)
    private String phoneE164;

    @Column(nullable = false)
    private String governorate;

    /** Adresse exacte de livraison : donnée personnelle (admin + bon de livraison uniquement). */
    @Column(nullable = false)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    private String carrier;

    @Column(name = "tracking_number")
    private String trackingNumber;

    @Column(name = "utm_source")
    private String utmSource;

    @Column(name = "utm_campaign")
    private String utmCampaign;

    @Column(name = "utm_content")
    private String utmContent;

    @Column(name = "tracking_token_hash")
    private String trackingTokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    protected CustomerOrder() {}

    public CustomerOrder(String ref, Product product, int quantity, String customerName, String phoneE164,
            String governorate, String address, Instant now) {
        this.ref = ref;
        this.product = product;
        this.quantity = quantity;
        this.amountMillimes = product.getPriceMillimes() * quantity;
        this.customerName = customerName;
        this.phoneE164 = phoneE164;
        this.governorate = governorate;
        this.address = address;
        this.status = OrderStatus.NEW;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Applique un changement de statut et horodate l'étape. La validité est vérifiée par l'appelant. */
    public void applyStatus(OrderStatus target, Instant now) {
        this.status = target;
        this.updatedAt = now;
        switch (target) {
            case CONFIRMED -> this.confirmedAt = now;
            case SHIPPED -> this.shippedAt = now;
            case DELIVERED -> this.deliveredAt = now;
            case RETURNED -> this.returnedAt = now;
            case CANCELLED -> this.cancelledAt = now;
            default -> { }
        }
    }

    public String firstName() {
        String trimmed = customerName == null ? "" : customerName.trim();
        int space = trimmed.indexOf(' ');
        return space < 0 ? trimmed : trimmed.substring(0, space);
    }

    /** "tiktok / nov / reel-3" (parties absentes omises), {@code null} si aucune. */
    public String sourceLabel() {
        StringBuilder sb = new StringBuilder();
        for (String part : new String[] {utmSource, utmCampaign, utmContent}) {
            if (part != null && !part.isBlank()) {
                if (!sb.isEmpty()) {
                    sb.append(" / ");
                }
                sb.append(part);
            }
        }
        return sb.isEmpty() ? null : sb.toString();
    }

    public Long getId() {
        return id;
    }

    public String getRef() {
        return ref;
    }

    public Product getProduct() {
        return product;
    }

    public int getQuantity() {
        return quantity;
    }

    public long getAmountMillimes() {
        return amountMillimes;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getPhoneE164() {
        return phoneE164;
    }

    public String getGovernorate() {
        return governorate;
    }

    public String getAddress() {
        return address;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public String getCarrier() {
        return carrier;
    }

    public void setCarrier(String carrier) {
        this.carrier = carrier;
    }

    public String getTrackingNumber() {
        return trackingNumber;
    }

    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }

    public String getUtmSource() {
        return utmSource;
    }

    public String getUtmCampaign() {
        return utmCampaign;
    }

    public String getUtmContent() {
        return utmContent;
    }

    public void setSource(String utmSource, String utmCampaign, String utmContent) {
        this.utmSource = utmSource;
        this.utmCampaign = utmCampaign;
        this.utmContent = utmContent;
    }

    public String getTrackingTokenHash() {
        return trackingTokenHash;
    }

    public void setTrackingTokenHash(String trackingTokenHash) {
        this.trackingTokenHash = trackingTokenHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getShippedAt() {
        return shippedAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public Instant getReturnedAt() {
        return returnedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }
}
