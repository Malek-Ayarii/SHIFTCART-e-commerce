package com.shiftcart.order;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Cycle de vie d'une commande COD (docs/API.md).
 *
 * <pre>
 * NEW → CONFIRMED | PENDING | CANCELLED
 * PENDING → CONFIRMED | CANCELLED
 * CONFIRMED → SHIPPED | CANCELLED
 * SHIPPED → DELIVERED | RETURNED
 * </pre>
 */
public enum OrderStatus {
    NEW("Nouvelle"),
    PENDING("En attente"),
    CONFIRMED("Confirmée"),
    SHIPPED("Expédiée"),
    DELIVERED("Livrée"),
    RETURNED("Retournée"),
    CANCELLED("Annulée");

    private final String label;

    OrderStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    /** Transitions autorisées, dans l'ordre d'affichage. */
    public List<OrderStatus> allowedTransitions() {
        return switch (this) {
            case NEW -> List.of(CONFIRMED, PENDING, CANCELLED);
            case PENDING -> List.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> List.of(SHIPPED, CANCELLED);
            case SHIPPED -> List.of(DELIVERED, RETURNED);
            case DELIVERED, RETURNED, CANCELLED -> List.of();
        };
    }

    public boolean canTransitionTo(OrderStatus target) {
        return allowedTransitions().contains(target);
    }

    /** Statuts en attente de confirmation client. */
    public static final Set<OrderStatus> AWAITING_CONFIRMATION = EnumSet.of(NEW, PENDING);

    /** Statuts d'un colis remis au transporteur. */
    public static final Set<OrderStatus> SHIPPED_OR_LATER = EnumSet.of(SHIPPED, DELIVERED, RETURNED);
}
