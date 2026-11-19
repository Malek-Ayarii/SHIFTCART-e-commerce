package com.nexoshift.common.ratelimit;

import com.nexoshift.common.config.AppProperties;
import java.time.Clock;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Toutes les règles de limitation de l'API (configurables, voir .env.example). */
@Component
public class RateLimiters {

    private final SlidingWindowRateLimiter orderByIp;
    private final SlidingWindowRateLimiter orderByPhone;
    private final SlidingWindowRateLimiter loginByIp;

    public RateLimiters(AppProperties props, Clock clock) {
        AppProperties.RateLimit rl = props.rateLimit();
        this.orderByIp = new SlidingWindowRateLimiter(rl.ipMax(), rl.ipWindow(), clock);
        this.orderByPhone = new SlidingWindowRateLimiter(rl.phoneMax(), rl.phoneWindow(), clock);
        this.loginByIp = new SlidingWindowRateLimiter(
                props.auth().loginMaxAttempts(), props.auth().loginWindow(), clock);
    }

    public SlidingWindowRateLimiter orderByIp() {
        return orderByIp;
    }

    public SlidingWindowRateLimiter orderByPhone() {
        return orderByPhone;
    }

    public SlidingWindowRateLimiter loginByIp() {
        return loginByIp;
    }

    @Scheduled(fixedDelayString = "PT5M")
    public void cleanup() {
        all().forEach(SlidingWindowRateLimiter::cleanup);
    }

    /** Pour les tests. */
    public void resetAll() {
        all().forEach(SlidingWindowRateLimiter::reset);
    }

    private List<SlidingWindowRateLimiter> all() {
        return List.of(orderByIp, orderByPhone, loginByIp);
    }
}
