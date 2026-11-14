package com.shiftcart.messages;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;

/**
 * Génère le message WhatsApp proposé à l'agent (texte modifiable avant envoi).
 * Avec {@code LLM_API_KEY} : prompt court à l'API Anthropic ; sinon, ou en cas d'échec : gabarit.
 * Le prompt n'inclut que prénom, pack, gouvernorat, montant et n° de commande (jamais le téléphone).
 */
@Service
public class MessageGenerator {

    static final String SYSTEM_PROMPT = """
            Tu écris des messages WhatsApp pour SHIFT CART, une boutique tunisienne qui vend des packs « routine » \
            payés à la livraison. Écris en français, en tutoyant, 1 à 2 phrases courtes, ton chaleureux et naturel. \
            Mentionne le prénom, le pack, le gouvernorat de livraison et le montant en TND (paiement à la livraison). \
            Termine en demandant de répondre OUI pour confirmer. Pas de guillemets, pas de signature, \
            n'invente aucune promesse (délai, cadeau, réduction). Réponds uniquement avec le message.""";

    private final LlmClient llm;

    public MessageGenerator(LlmClient llm) {
        this.llm = llm;
    }

    public String generate(Tone tone, MessageContext ctx) {
        return llm.complete(SYSTEM_PROMPT, userPrompt(tone, ctx))
                .map(MessageGenerator::clean)
                .filter(s -> !s.isBlank() && s.length() <= 600)
                .orElseGet(() -> MessageTemplates.render(tone,
                        ThreadLocalRandom.current().nextInt(MessageTemplates.variantCount(tone)), ctx));
    }

    static String userPrompt(Tone tone, MessageContext ctx) {
        String style = switch (tone) {
            case AMICAL -> "amical et enthousiaste";
            case DIRECT -> "direct et efficace, avec le numéro de commande #" + ctx.orderNumber();
            case RELANCE -> "relance douce : le client n'a pas encore répondu";
        };
        return "Ton : " + style + ".\nPrénom : " + ctx.firstName() + "\nPack : " + ctx.pack()
                + "\nGouvernorat : " + ctx.governorate() + "\nMontant : " + ctx.amount() + " TND";
    }

    static String clean(String text) {
        String t = text.trim();
        if (t.length() >= 2 && (t.startsWith("\"") && t.endsWith("\"") || t.startsWith("«") && t.endsWith("»"))) {
            t = t.substring(1, t.length() - 1).trim();
        }
        return t;
    }
}
