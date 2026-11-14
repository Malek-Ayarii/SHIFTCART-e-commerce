package com.shiftcart.order.dto;

import com.shiftcart.order.validation.OrderConstraints.Address;
import com.shiftcart.order.validation.OrderConstraints.CustomerName;
import com.shiftcart.order.validation.OrderConstraints.Governorate;
import com.shiftcart.order.validation.OrderConstraints.TnPhoneNumber;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Corps de {@code POST /api/orders} (docs/CONTRACT.md). */
public record CreateOrderRequest(
        @CustomerName String customerName,
        @TnPhoneNumber String phone,
        @Governorate String governorate,
        /** Adresse exacte (rue, n°, quartier, ville) : donnée personnelle, jamais loggée ni renvoyée au public. */
        @Address String address,
        String productSku,
        @Min(value = 1, message = "La quantité doit être comprise entre 1 et 10.")
        @Max(value = 10, message = "La quantité doit être comprise entre 1 et 10.")
        Integer quantity,
        Source source,
        /** Honeypot : doit rester vide. */
        String website) {

    /** Attribution marketing (tronquée à 100 caractères, jamais bloquante). */
    public record Source(String utmSource, String utmCampaign, String utmContent) {}

    /** Adresse nettoyée, exactement comme elle est validée ({@code OrderConstraints.normalizeAddress}). */
    public String cleanAddress() {
        return com.shiftcart.order.validation.OrderConstraints.normalizeAddress(address);
    }

    public int quantityOrDefault() {
        return quantity == null ? 1 : quantity;
    }

    public String skuOrDefault() {
        return productSku == null || productSku.isBlank() ? "PACK-BARISTA" : productSku.trim();
    }
}
