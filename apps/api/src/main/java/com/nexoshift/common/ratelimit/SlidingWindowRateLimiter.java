package com.nexoshift.common.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limiteur en mémoire à fenêtre glissante (une instance = une règle, ex. 5 essais / 10 min par IP).
 *
 * <p>Suffisant pour une instance unique de l'API. Avec plusieurs instances, remplacer par un stockage
 * partagé (Redis, table Postgres). Les clés peuvent être des données personnelles (téléphone) :
 * elles ne sont jamais loguées.
 */
public class SlidingWindowRateLimiter {

    private final int maxAttempts;
    private final long windowMillis;
    private final Clock clock;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public SlidingWindowRateLimiter(int maxAttempts, Duration window, Clock clock) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = window.toMillis();
        this.clock = clock;
    }

    /** Enregistre une tentative et renvoie {@code false} si la limite est dépassée. */
    public boolean tryAcquire(String key) {
        if (maxAttempts <= 0) {
            return true;
        }
        long now = clock.millis();
        Deque<Long> deque = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (deque) {
            evict(deque, now);
            if (deque.size() >= maxAttempts) {
                return false;
            }
            deque.addLast(now);
            return true;
        }
    }

    /** Vrai si la clé a déjà atteint la limite (sans consommer de tentative). */
    public boolean isExhausted(String key) {
        if (maxAttempts <= 0) {
            return false;
        }
        Deque<Long> deque = hits.get(key);
        if (deque == null) {
            return false;
        }
        synchronized (deque) {
            evict(deque, clock.millis());
            return deque.size() >= maxAttempts;
        }
    }

    /** Purge les clés expirées (appelé périodiquement). */
    public void cleanup() {
        long now = clock.millis();
        hits.entrySet().removeIf(e -> {
            Deque<Long> deque = e.getValue();
            synchronized (deque) {
                evict(deque, now);
                return deque.isEmpty();
            }
        });
    }

    public void reset() {
        hits.clear();
    }

    private void evict(Deque<Long> deque, long now) {
        while (!deque.isEmpty() && now - deque.peekFirst() >= windowMillis) {
            deque.pollFirst();
        }
    }
}
