package com.shiftcart.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ConfirmationDetectorTest {

    @ParameterizedTest
    @ValueSource(strings = {"oui", "OUI", "Oui !", "ouiii", "ok", "OK 👍", "okay", "نعم", "ey", "Eyh", "d'accord",
        "D’accord merci", "yes", "Confirmé", "je confirme", "Je confirme ma commande SC-2951", "oui merci beaucoup",
        "👍", "إيه"})
    void confirmations(String text) {
        assertThat(ConfirmationDetector.isConfirmation(text)).as(text).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "non", "Non merci", "pas maintenant", "annule stp", "c'est quoi le prix ?",
        "je ne confirme pas", "لا", "Bonjour, je voudrais changer l'adresse de livraison"})
    void notConfirmations(String text) {
        assertThat(ConfirmationDetector.isConfirmation(text)).as(text).isFalse();
    }

    @Test
    void extractsRef() {
        assertThat(ConfirmationDetector.extractRef("Je confirme ma commande SC-2951")).isEqualTo("SC-2951");
        assertThat(ConfirmationDetector.extractRef("commande sc2951")).isEqualTo("SC-2951");
        assertThat(ConfirmationDetector.extractRef("oui")).isNull();
    }
}
