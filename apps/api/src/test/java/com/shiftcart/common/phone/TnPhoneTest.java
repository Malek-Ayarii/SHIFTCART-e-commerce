package com.shiftcart.common.phone;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

class TnPhoneTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "abc"})
    void emptyNumber(String raw) {
        assertThat(TnPhone.validate(raw)).isEqualTo("Ton numéro nous sert à confirmer la commande sur WhatsApp.");
    }

    @ParameterizedTest
    @CsvSource({
        "9876543, Il manque 1 chiffre (8 au total).",
        "987654, Il manque 2 chiffres (8 au total).",
        "9, Il manque 7 chiffres (8 au total).",
        "'98 76 5', Il manque 3 chiffres (8 au total)."
    })
    void missingDigitsWithPlural(String raw, String expected) {
        assertThat(TnPhone.validate(raw)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"08765432", "18765432", "68765432", "88765432"})
    void invalidFirstDigit(String raw) {
        assertThat(TnPhone.validate(raw)).isEqualTo("Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.");
    }

    @ParameterizedTest
    @ValueSource(strings = {"22345678", "32345678", "42345678", "52345678", "72345678", "98765432", "98 765 432"})
    void validNumbers(String raw) {
        assertThat(TnPhone.validate(raw)).isNull();
    }

    @Test
    void tooLong() {
        assertThat(TnPhone.validate("987654321")).isEqualTo(TnPhone.MSG_TOO_LONG);
    }

    @Test
    void formatsAndMasks() {
        assertThat(TnPhone.toE164("98 765 432")).isEqualTo("+21698765432");
        assertThat(TnPhone.display("+21698765432")).isEqualTo("+216 98 765 432");
        assertThat(TnPhone.mask("+21698765432")).isEqualTo("+216 98 ••• 432").doesNotContain("765");
        assertThat(TnPhone.mask("garbage")).doesNotContain("garbage");
        assertThat(TnPhone.waId("+21698765432")).isEqualTo("21698765432");
    }

    @Test
    void normalizesWhatsAppSenders() {
        assertThat(TnPhone.normalizeAnyToE164("21698765432")).isEqualTo("+21698765432");
        assertThat(TnPhone.normalizeAnyToE164("0021698765432")).isEqualTo("+21698765432");
        assertThat(TnPhone.normalizeAnyToE164("98765432")).isEqualTo("+21698765432");
        assertThat(TnPhone.normalizeAnyToE164("33612345678")).isNull();
    }
}
