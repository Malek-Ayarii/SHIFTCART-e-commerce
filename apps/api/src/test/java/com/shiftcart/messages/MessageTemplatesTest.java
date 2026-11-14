package com.shiftcart.messages;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mockito;

class MessageTemplatesTest {

    private static final MessageContext CTX = new MessageContext("Mohamed", "Pack Barista", "Tunis", "89", "2948");

    @Test
    void baseAmicalTemplateIsExact() {
        assertThat(MessageTemplates.render(Tone.AMICAL, 0, CTX)).isEqualTo(
                "Salut Mohamed ! Ton Pack Barista pour Tunis est prêt (89 TND, paiement à la livraison). "
                        + "Réponds OUI pour déclencher la livraison 🚚");
    }

    @Test
    void directAndRelanceMatchMockups() {
        assertThat(MessageTemplates.render(Tone.DIRECT, 0, CTX)).isEqualTo(
                "Bonjour Mohamed, commande #2948 : Pack Barista, 89 TND en espèces, livraison à Tunis sous 24–48 h. "
                        + "Réponds OUI pour confirmer.");
        assertThat(MessageTemplates.render(Tone.RELANCE, 0, CTX)).startsWith(
                "Salut Mohamed, petit rappel : ton Pack Barista t’attend toujours");
    }

    @ParameterizedTest
    @EnumSource(Tone.class)
    void everyVariantHasAllVariablesAndAsksForOui(Tone tone) {
        for (int v = 0; v < MessageTemplates.variantCount(tone); v++) {
            String text = MessageTemplates.render(tone, v, CTX);
            assertThat(text).contains("Mohamed", "Pack Barista", "Tunis", "89 TND", "OUI")
                    .doesNotContain("{").doesNotContain("}");
        }
    }

    @Test
    void recapContainsTrackingLink() {
        assertThat(MessageTemplates.confirmationRecap(CTX, "http://localhost:3000/suivi/SC-2948?t=abc"))
                .contains("Mohamed").contains("89 TND").endsWith("http://localhost:3000/suivi/SC-2948?t=abc");
    }

    @Test
    void generatorFallsBackToTemplatesWithoutLlm() {
        LlmClient llm = Mockito.mock(LlmClient.class);
        Mockito.when(llm.complete(Mockito.anyString(), Mockito.anyString())).thenReturn(Optional.empty());
        String text = new MessageGenerator(llm).generate(Tone.AMICAL, CTX);
        assertThat(text).contains("Mohamed").contains("OUI");
    }

    @Test
    void generatorUsesLlmTextWhenAvailable() {
        LlmClient llm = Mockito.mock(LlmClient.class);
        Mockito.when(llm.complete(Mockito.anyString(), Mockito.contains("Prénom : Mohamed")))
                .thenReturn(Optional.of("\"Hello Mohamed, réponds OUI !\""));
        assertThat(new MessageGenerator(llm).generate(Tone.DIRECT, CTX)).isEqualTo("Hello Mohamed, réponds OUI !");
    }

    @Test
    void toneParsing() {
        assertThat(Tone.parse("Amical")).contains(Tone.AMICAL);
        assertThat(Tone.parse("relance")).contains(Tone.RELANCE);
        assertThat(Tone.parse("autre")).isEmpty();
        assertThat(Tone.parse(null)).isEmpty();
    }
}
