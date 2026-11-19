package com.nexoshift.common.config;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CoreConfig {

    /** Fuseau métier : les mois des stats et les dates affichées sont en heure de Tunis. */
    public static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Client HTTP partagé (WhatsApp Cloud API, Anthropic) ; les délais par requête sont fixés à l'appel. */
    @Bean
    HttpClient httpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }
}
