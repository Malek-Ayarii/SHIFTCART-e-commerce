package com.shiftcart.messages;

import com.shiftcart.order.CustomerOrder;
import com.shiftcart.whatsapp.WhatsAppClient;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Envoi d'un message sortant à un client et enregistrement en base.
 *
 * <p><b>Texte libre ou modèle ?</b> WhatsApp n'autorise le texte libre que dans les 24 h qui suivent le
 * dernier message reçu du client. Si le dernier message entrant de ce numéro date de moins de 24 h, on
 * envoie le texte (éventuellement retouché par l'agent). Sinon, on envoie le modèle pré-approuvé
 * {@code order_confirmation} (prénom, pack, gouvernorat, montant) : le texte de l'agent est alors
 * enregistré pour l'historique, mais c'est le modèle Meta qui part.
 */
@Service
public class MessageService {

    public static final Duration CUSTOMER_SERVICE_WINDOW = Duration.ofHours(24);

    private final MessageRepository messages;
    private final WhatsAppClient whatsApp;
    private final Clock clock;

    public MessageService(MessageRepository messages, WhatsAppClient whatsApp, Clock clock) {
        this.messages = messages;
        this.whatsApp = whatsApp;
        this.clock = clock;
    }

    /** Vrai si le client nous a écrit il y a moins de 24 h. */
    public boolean inCustomerServiceWindow(String phoneE164) {
        Instant now = clock.instant();
        return messages.findFirstByPhoneE164AndDirectionOrderByCreatedAtDesc(phoneE164, Message.IN)
                .map(m -> m.getCreatedAt().isAfter(now.minus(CUSTOMER_SERVICE_WINDOW)))
                .orElse(false);
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public Message sendToCustomer(CustomerOrder order, String body, String tone) {
        WhatsAppClient.SendResult result;
        if (inCustomerServiceWindow(order.getPhoneE164())) {
            result = whatsApp.sendText(order.getPhoneE164(), body);
        } else {
            MessageContext ctx = MessageContext.of(order);
            result = whatsApp.sendTemplate(order.getPhoneE164(),
                    List.of(ctx.firstName(), ctx.pack(), ctx.governorate(), ctx.amount()));
        }
        return messages.save(new Message(order.getId(), order.getPhoneE164(), Message.OUT, tone, body,
                result.status(), result.providerMessageId(), clock.instant()));
    }

    /** Texte libre (réponse dans la fenêtre de 24 h, ex. récapitulatif après « OUI »). */
    @Transactional(propagation = Propagation.REQUIRED)
    public Message sendTextReply(CustomerOrder order, String body) {
        WhatsAppClient.SendResult result = whatsApp.sendText(order.getPhoneE164(), body);
        return messages.save(new Message(order.getId(), order.getPhoneE164(), Message.OUT, null, body,
                result.status(), result.providerMessageId(), clock.instant()));
    }
}
