package com.shiftcart.messages;

import com.shiftcart.common.money.Money;
import com.shiftcart.order.CustomerOrder;

/** Variables d'un message client : prénom, pack, gouvernorat, montant (format français), n° de commande. */
public record MessageContext(String firstName, String pack, String governorate, String amount, String orderNumber) {

    public static MessageContext of(CustomerOrder order) {
        return new MessageContext(
                order.firstName(),
                order.getProduct().shortName(),
                order.getGovernorate(),
                Money.formatTnd(order.getAmountMillimes()),
                order.getRef().replaceFirst("^SC-", ""));
    }
}
