package com.shiftcart.whatsapp;

import com.shiftcart.common.config.AppProperties;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Lien « Ouvrir WhatsApp » de l'écran de confirmation : {@code https://wa.me/<WHATSAPP_SHOP_NUMBER>?text=…}.
 * Sans numéro configuré ([À DÉFINIR]), on renvoie {@code https://wa.me/?text=…} (WhatsApp demande alors
 * au client de choisir le destinataire) et on l'indique une fois dans les logs.
 */
@Component
public class WhatsAppLinks {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppLinks.class);

    private final AppProperties props;
    private final AtomicBoolean warned = new AtomicBoolean();

    public WhatsAppLinks(AppProperties props) {
        this.props = props;
    }

    public String confirmUrl(String ref) {
        String text = "Je confirme ma commande " + ref;
        String encoded = URLEncoder.encode(text, StandardCharsets.UTF_8).replace("+", "%20");
        String number = props.whatsapp().shopNumber() == null ? "" : props.whatsapp().shopNumber().replaceAll("\\D", "");
        if (number.isEmpty() && warned.compareAndSet(false, true)) {
            log.warn("WHATSAPP_SHOP_NUMBER is not set [À DÉFINIR]: confirmation links use https://wa.me/ without a number");
        }
        return "https://wa.me/" + number + "?text=" + encoded;
    }
}
