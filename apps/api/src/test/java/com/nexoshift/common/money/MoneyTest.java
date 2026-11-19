package com.nexoshift.common.money;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MoneyTest {

    @Test
    void convertsMillimesToCleanTnd() throws Exception {
        ObjectMapper mapper = new ObjectMapper().enable(JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN);
        assertThat(mapper.writeValueAsString(Map.of("v", Money.toTnd(89_000)))).isEqualTo("{\"v\":89}");
        assertThat(mapper.writeValueAsString(Map.of("v", Money.toTnd(12_638_500)))).isEqualTo("{\"v\":12638.5}");
        assertThat(mapper.writeValueAsString(Map.of("v", Money.toTnd(1_000_000)))).isEqualTo("{\"v\":1000}");
        assertThat(mapper.writeValueAsString(Map.of("v", Money.toTnd(0)))).isEqualTo("{\"v\":0}");
    }

    @Test
    void convertsTndToMillimes() {
        assertThat(Money.toMillimes(new BigDecimal("41.5"))).isEqualTo(41_500);
        assertThat(Money.toMillimes(new BigDecimal("7"))).isEqualTo(7_000);
    }

    @Test
    void percentagesAndDeltas() {
        assertThat(Money.pct(9612, 12638)).isEqualTo(76);
        assertThat(Money.pct(1, 0)).isZero();
        assertThat(Money.deltaPct(142, 120)).isEqualTo(18);
        assertThat(Money.deltaPct(5, 0)).isNull();
    }

    @Test
    void formatsFrench() {
        assertThat(Money.formatTnd(89_000)).isEqualTo("89");
        assertThat(Money.formatTnd(12_638_500)).isEqualTo("12 638,5");
    }
}
