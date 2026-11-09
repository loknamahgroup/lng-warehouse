package com.branchstock.security;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/** In-memory brute-force guard: 5 failed logins per client+username lock that pair for 15 minutes. */
@Component
public class LoginAttemptService {

    private static final int MAX_FAILURES = 5;
    private static final long WINDOW_MS = 15 * 60 * 1000L;

    private record Entry(int failures, long firstFailureAt, long lockedUntil) {
    }

    private final ConcurrentHashMap<String, Entry> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String key) {
        Entry e = attempts.get(key);
        if (e == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (e.lockedUntil() > now) {
            return true;
        }
        if (e.lockedUntil() > 0 || now - e.firstFailureAt() > WINDOW_MS) {
            attempts.remove(key);
        }
        return false;
    }

    public void recordFailure(String key) {
        long now = System.currentTimeMillis();
        if (attempts.size() > 5000) {
            attempts.entrySet().removeIf(en -> en.getValue().lockedUntil() < now
                    && now - en.getValue().firstFailureAt() > WINDOW_MS);
        }
        attempts.compute(key, (k, e) -> {
            if (e == null || now - e.firstFailureAt() > WINDOW_MS) {
                return new Entry(1, now, 0);
            }
            int failures = e.failures() + 1;
            return new Entry(failures, e.firstFailureAt(), failures >= MAX_FAILURES ? now + WINDOW_MS : 0);
        });
    }

    public void recordSuccess(String key) {
        attempts.remove(key);
    }
}
