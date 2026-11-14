package com.shiftcart.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.common.phone.TnPhone;
import com.shiftcart.messages.Message;
import com.shiftcart.messages.MessageContext;
import com.shiftcart.messages.MessageRepository;
import com.shiftcart.messages.MessageService;
import com.shiftcart.messages.MessageTemplates;
import com.shiftcart.order.CustomerOrder;
import com.shiftcart.order.OrderEvent;
import com.shiftcart.order.OrderRepository;
import com.shiftcart.order.OrderStatus;
import com.shiftcart.order.OrderWorkflow;
import com.shiftcart.order.TrackingTokenService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Traitement des notifications WhatsApp Cloud API (payload {@code whatsapp_business_account}).
 *
 * <p>Pour chaque message entrant : on l'enregistre (direction IN), on retrouve la commande du numéro
 * (celle dont la réf est citée, sinon la dernière {@code NEW}/{@code PENDING}), et si le texte est une
 * confirmation, la commande passe {@code CONFIRMED} (acteur {@code system}) et le client reçoit le
 * récapitulatif avec son lien de suivi. Les accusés {@code statuses} mettent à jour nos messages sortants.
 */
@Service
public class WhatsAppInboundService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppInboundService.class);

    private final OrderRepository orders;
    private final MessageRepository messages;
    private final OrderWorkflow workflow;
    private final MessageService messageService;
    private final TrackingTokenService tokens;
    private final Clock clock;

    public WhatsAppInboundService(OrderRepository orders, MessageRepository messages, OrderWorkflow workflow,
            MessageService messageService, TrackingTokenService tokens, Clock clock) {
        this.orders = orders;
        this.messages = messages;
        this.workflow = workflow;
        this.messageService = messageService;
        this.tokens = tokens;
        this.clock = clock;
    }

    @Transactional
    public void handle(JsonNode payload) {
        for (JsonNode entry : payload.path("entry")) {
            for (JsonNode change : entry.path("changes")) {
                JsonNode value = change.path("value");
                for (JsonNode msg : value.path("messages")) {
                    handleMessage(msg);
                }
                for (JsonNode status : value.path("statuses")) {
                    handleStatus(status);
                }
            }
        }
    }

    private void handleMessage(JsonNode msg) {
        String providerId = msg.path("id").asText(null);
        if (providerId != null && messages.existsByProviderMessageIdAndDirection(providerId, Message.IN)) {
            return; // Meta peut renvoyer la même notification : traitement idempotent.
        }
        String phone = TnPhone.normalizeAnyToE164(msg.path("from").asText(""));
        String text = extractText(msg);
        Instant receivedAt = parseTimestamp(msg.path("timestamp").asText(null));
        if (phone == null) {
            log.info("Inbound WhatsApp message from a non-Tunisian number ignored");
            return;
        }

        Optional<CustomerOrder> target = findTargetOrder(phone, text);
        messages.save(new Message(target.map(CustomerOrder::getId).orElse(null), phone, Message.IN, null,
                text == null ? "[" + msg.path("type").asText("message") + "]" : text, Message.STATUS_RECEIVED,
                providerId, receivedAt));

        if (target.isEmpty()) {
            log.info("Inbound WhatsApp message from {}: no matching order", TnPhone.mask(phone));
            return;
        }
        CustomerOrder order = orders.findByIdForUpdate(target.get().getId()).orElseThrow();
        if (text != null && ConfirmationDetector.isConfirmation(text)
                && OrderStatus.AWAITING_CONFIRMATION.contains(order.getStatus())) {
            workflow.transition(order, OrderStatus.CONFIRMED, OrderEvent.ACTOR_SYSTEM, null, null,
                    "Confirmée par le client sur WhatsApp");
            String recap = MessageTemplates.confirmationRecap(MessageContext.of(order),
                    tokens.trackingUrl(order.getRef(), tokens.tokenFor(order.getRef())));
            messageService.sendTextReply(order, recap);
        } else {
            log.info("Inbound WhatsApp message stored for order {}", order.getRef());
        }
    }

    /** La commande citée par sa réf (si elle appartient à ce numéro), sinon la dernière NEW/PENDING, sinon la dernière. */
    private Optional<CustomerOrder> findTargetOrder(String phone, String text) {
        String ref = ConfirmationDetector.extractRef(text);
        if (ref != null) {
            Optional<CustomerOrder> byRef = orders.findByRef(ref.toUpperCase(Locale.ROOT))
                    .filter(o -> o.getPhoneE164().equals(phone));
            if (byRef.isPresent()) {
                return byRef;
            }
        }
        List<CustomerOrder> awaiting = orders.findByPhoneE164AndStatusInOrderByCreatedAtDesc(phone,
                OrderStatus.AWAITING_CONFIRMATION);
        if (!awaiting.isEmpty()) {
            return Optional.of(awaiting.get(0));
        }
        List<CustomerOrder> any = orders.findByPhoneE164AndStatusInOrderByCreatedAtDesc(phone,
                List.of(OrderStatus.values()));
        return any.isEmpty() ? Optional.empty() : Optional.of(any.get(0));
    }

    private void handleStatus(JsonNode status) {
        String providerId = status.path("id").asText(null);
        String value = status.path("status").asText("");
        if (providerId == null || value.isEmpty()) {
            return;
        }
        messages.findFirstByProviderMessageId(providerId)
                .filter(m -> Message.OUT.equals(m.getDirection()))
                .ifPresent(m -> m.setStatus(value.toUpperCase(Locale.ROOT)));
    }

    private static String extractText(JsonNode msg) {
        String type = msg.path("type").asText("");
        return switch (type) {
            case "text" -> msg.path("text").path("body").asText(null);
            case "button" -> msg.path("button").path("text").asText(null);
            case "interactive" -> {
                JsonNode i = msg.path("interactive");
                String t = i.path("button_reply").path("title").asText(null);
                yield t != null ? t : i.path("list_reply").path("title").asText(null);
            }
            case "reaction" -> msg.path("reaction").path("emoji").asText(null);
            default -> null;
        };
    }

    private Instant parseTimestamp(String epochSeconds) {
        try {
            return epochSeconds == null ? clock.instant() : Instant.ofEpochSecond(Long.parseLong(epochSeconds));
        } catch (NumberFormatException e) {
            return clock.instant();
        }
    }
}
