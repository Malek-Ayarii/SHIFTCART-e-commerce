package com.nexoshift.order;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

/** Le bon de livraison (document interne) porte l'adresse exacte. */
class DeliverySlipServiceTest {

    @Test
    void slipShowsExactAddress() throws Exception {
        Instant now = Instant.parse("2026-11-14T10:32:00Z");
        Product product = new Product("PACK-SETUP", "pack-setup-productivite", "Le Pack Setup & Productivité", now);
        product.setPriceMillimes(79_000);
        CustomerOrder order = new CustomerOrder("SC-3001", product, 1, "Mohamed Ben Ali", "+21698765432", "Sousse",
                "12 rue de Marseille, cite El Khadra, Tunis", now);
        byte[] pdf = new DeliverySlipService().render(order);
        try (PdfReader reader = new PdfReader(pdf)) {
            String text = new PdfTextExtractor(reader).getTextFromPage(1);
            assertThat(text).contains("Adresse").contains("12 rue de Marseille").contains("El Khadra")
                    .contains("SC-3001").contains("79");
        }
    }
}
