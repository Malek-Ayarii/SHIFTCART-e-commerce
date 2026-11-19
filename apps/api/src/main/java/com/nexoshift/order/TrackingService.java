package com.nexoshift.order;

import com.nexoshift.common.config.CoreConfig;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.money.Money;
import com.nexoshift.order.dto.TrackingResponse;
import com.nexoshift.order.dto.TrackingResponse.Step;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suivi public d'une commande (lien signé).
 *
 * <p>Étapes : RECEIVED → CONFIRMED → SHIPPED → DELIVERED. L'étape du statut courant est {@code current}
 * (NEW/PENDING : « Commande reçue » en cours, en attente de la confirmation WhatsApp), les précédentes
 * {@code done}, les suivantes {@code upcoming}. DELIVERED : tout est {@code done}.
 * CANCELLED : les étapes atteintes restent {@code done}, les autres passent à {@code cancelled}
 * (la première porte le détail « Commande annulée »). RETURNED : RECEIVED/CONFIRMED/SHIPPED {@code done},
 * DELIVERED {@code cancelled} avec le détail « Colis retourné ».
 */
@Service
public class TrackingService {

    private final OrderRepository orders;
    private final TrackingTokenService tokens;

    public TrackingService(OrderRepository orders, TrackingTokenService tokens) {
        this.orders = orders;
        this.tokens = tokens;
    }

    @Transactional(readOnly = true)
    public TrackingResponse track(String ref, String token) {
        String normalizedRef = ref == null ? "" : ref.trim().toUpperCase();
        CustomerOrder order = orders.findByRef(normalizedRef)
                .orElseThrow(() -> ApiException.notFound("Commande introuvable."));
        if (!tokens.verify(order, token)) {
            throw ApiException.forbidden("Lien de suivi invalide.");
        }
        return toResponse(order);
    }

    TrackingResponse toResponse(CustomerOrder o) {
        return new TrackingResponse(
                o.getRef(),
                o.getStatus().name(),
                o.getProduct().getName(),
                o.getProduct().getSlug(),
                com.nexoshift.media.MediaDto.urlOf(o.getProduct().getCoverMediaId()),
                Money.toTnd(o.getAmountMillimes()),
                o.getGovernorate(),
                o.firstName(),
                o.getCarrier(),
                o.getTrackingNumber(),
                eta(o),
                steps(o));
    }

    static LocalDate eta(CustomerOrder o) {
        return switch (o.getStatus()) {
            case DELIVERED, CANCELLED, RETURNED -> null;
            default -> o.getShippedAt() != null
                    ? LocalDate.ofInstant(o.getShippedAt(), CoreConfig.TUNIS).plusDays(2)
                    : LocalDate.ofInstant(o.getCreatedAt(), CoreConfig.TUNIS).plusDays(3);
        };
    }

    static List<Step> steps(CustomerOrder o) {
        String carrierLabel = Carriers.display(o.getCarrier());
        String shippedLabel = carrierLabel == null ? "Expédiée" : "Expédiée avec " + carrierLabel;
        String shippedDetail = o.getTrackingNumber() == null ? null : "N° de suivi " + o.getTrackingNumber();

        String[] keys = {"RECEIVED", "CONFIRMED", "SHIPPED", "DELIVERED"};
        String[] labels = {"Commande reçue", "Confirmée sur WhatsApp", shippedLabel, "Livrée & payée"};
        Instant[] ats = {o.getCreatedAt(), o.getConfirmedAt(), o.getShippedAt(), o.getDeliveredAt()};
        String[] details = {null, null, shippedDetail, null};

        // Index de la dernière étape atteinte.
        int reached = o.getDeliveredAt() != null ? 3
                : o.getShippedAt() != null ? 2
                : o.getConfirmedAt() != null ? 1 : 0;

        List<Step> steps = new ArrayList<>(4);
        for (int i = 0; i < 4; i++) {
            String state;
            Instant at = i <= reached ? ats[i] : null;
            String detail = i <= reached ? details[i] : null;
            switch (o.getStatus()) {
                case DELIVERED -> state = "done";
                case CANCELLED -> {
                    if (i <= reached) {
                        state = "done";
                    } else {
                        state = "cancelled";
                        if (i == reached + 1) {
                            detail = "Commande annulée";
                            at = o.getCancelledAt();
                        }
                    }
                }
                case RETURNED -> {
                    if (i < 3) {
                        state = "done";
                    } else {
                        state = "cancelled";
                        detail = "Colis retourné";
                        at = o.getReturnedAt();
                    }
                }
                default -> state = i < reached ? "done" : i == reached ? "current" : "upcoming";
            }
            steps.add(new Step(keys[i], labels[i], state, at, detail));
        }
        return steps;
    }
}
