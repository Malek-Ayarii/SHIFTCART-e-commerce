package com.shiftcart.order;

import com.shiftcart.common.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Passe en {@code PENDING} les commandes {@code NEW} sans réponse après {@code ORDER_AUTO_PENDING_HOURS}
 * heures (acteur {@code system}). Désactivé par défaut (0) : le délai est [À DÉFINIR] (docs : « ex. 6 h »).
 */
@Component
public class AutoPendingJob {

    private final OrderRepository orders;
    private final OrderWorkflow workflow;
    private final AppProperties props;
    private final Clock clock;

    public AutoPendingJob(OrderRepository orders, OrderWorkflow workflow, AppProperties props, Clock clock) {
        this.orders = orders;
        this.workflow = workflow;
        this.props = props;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT1M")
    @Transactional
    public int run() {
        int hours = props.autoPendingAfterHours();
        if (hours <= 0) {
            return 0;
        }
        Instant cutoff = clock.instant().minus(Duration.ofHours(hours));
        int moved = 0;
        for (CustomerOrder candidate : orders.findByStatusAndCreatedAtBefore(OrderStatus.NEW, cutoff)) {
            CustomerOrder order = orders.findByIdForUpdate(candidate.getId()).orElse(null);
            if (order != null && order.getStatus() == OrderStatus.NEW) {
                workflow.transition(order, OrderStatus.PENDING, OrderEvent.ACTOR_SYSTEM, null, null,
                        "Sans réponse après " + hours + " h");
                moved++;
            }
        }
        return moved;
    }
}
