package com.nexoshift.order;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OrderStatusTest {

    @Test
    void transitionsMatchTheContract() {
        assertThat(OrderStatus.NEW.allowedTransitions())
                .containsExactly(OrderStatus.CONFIRMED, OrderStatus.PENDING, OrderStatus.CANCELLED);
        assertThat(OrderStatus.PENDING.allowedTransitions())
                .containsExactly(OrderStatus.CONFIRMED, OrderStatus.CANCELLED);
        assertThat(OrderStatus.CONFIRMED.allowedTransitions())
                .containsExactly(OrderStatus.SHIPPED, OrderStatus.CANCELLED);
        assertThat(OrderStatus.SHIPPED.allowedTransitions())
                .containsExactly(OrderStatus.DELIVERED, OrderStatus.RETURNED);
        assertThat(OrderStatus.DELIVERED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.RETURNED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.CANCELLED.allowedTransitions()).isEmpty();
        assertThat(OrderStatus.NEW.canTransitionTo(OrderStatus.SHIPPED)).isFalse();
    }

    @Test
    void carrierDisplay() {
        assertThat(Carriers.display("YALIDINE")).isEqualTo("Yalidine");
        assertThat(Carriers.display("BOSTA")).isEqualTo("Bosta");
        assertThat(Carriers.display("ARAMEX_EXPRESS")).isEqualTo("Aramex Express");
        assertThat(Carriers.normalize(" bosta ")).isEqualTo("BOSTA");
    }
}
