package com.shiftcart.order;

import com.shiftcart.common.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Machine à états des commandes : seul point d'écriture des changements de statut
 * (admin, webhook WhatsApp, passage automatique en attente). Chaque transition crée un {@link OrderEvent}.
 */
@Service
public class OrderWorkflow {

    private static final Logger log = LoggerFactory.getLogger(OrderWorkflow.class);

    private final OrderEventRepository events;
    private final ProductRepository products;
    private final Clock clock;

    public OrderWorkflow(OrderEventRepository events, ProductRepository products, Clock clock) {
        this.events = events;
        this.products = products;
        this.clock = clock;
    }

    /**
     * Applique {@code target} à une commande déjà verrouillée ({@code findByIdForUpdate}).
     * 409 {@code INVALID_TRANSITION} si la transition n'est pas autorisée.
     * {@code SHIPPED} : transporteur par défaut {@code YALIDINE}, décrémente les packs assemblés (≥ 0).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void transition(CustomerOrder order, OrderStatus target, String actor, String carrier,
            String trackingNumber, String note) {
        OrderStatus from = order.getStatus();
        if (!from.canTransitionTo(target)) {
            throw ApiException.conflict("INVALID_TRANSITION",
                    "Impossible de passer de « " + from.label() + " » à « " + target.label() + " ».");
        }
        Instant now = clock.instant();
        if (target == OrderStatus.SHIPPED) {
            String normalized = Carriers.normalize(carrier);
            order.setCarrier(normalized != null ? normalized
                    : order.getCarrier() != null ? order.getCarrier() : Carriers.DEFAULT);
            if (trackingNumber != null && !trackingNumber.isBlank()) {
                order.setTrackingNumber(trackingNumber.trim());
            }
            Product product = products.findByIdForUpdate(order.getProduct().getId()).orElseThrow();
            int remaining = product.getAssembledStock() - order.getQuantity();
            if (remaining < 0) {
                log.warn("Order {} shipped with not enough assembled packs ({} in stock)", order.getRef(),
                        product.getAssembledStock());
            }
            product.setAssembledStock(remaining);
        } else if (trackingNumber != null && !trackingNumber.isBlank()) {
            order.setTrackingNumber(trackingNumber.trim());
        }
        order.applyStatus(target, now);
        String cleanNote = note == null || note.isBlank() ? null : truncate(note.trim(), 500);
        events.save(new OrderEvent(order.getId(), from, target, actor, cleanNote, now));
        log.info("Order {} {} -> {} by {}", order.getRef(), from, target, actor);
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
