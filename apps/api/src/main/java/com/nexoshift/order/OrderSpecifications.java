package com.nexoshift.order;

import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/** Filtres de la liste admin : statuts, mois de création, recherche libre. */
final class OrderSpecifications {

    private OrderSpecifications() {}

    static Specification<CustomerOrder> statusIn(Collection<OrderStatus> statuses) {
        return (root, q, cb) -> statuses == null || statuses.isEmpty() ? null : root.get("status").in(statuses);
    }

    static Specification<CustomerOrder> productIs(Long productId) {
        return (root, q, cb) -> productId == null ? null : cb.equal(root.get("product").get("id"), productId);
    }

    static Specification<CustomerOrder> createdBetween(Instant start, Instant end) {
        return (root, q, cb) -> start == null ? null
                : cb.and(cb.greaterThanOrEqualTo(root.get("createdAt"), start), cb.lessThan(root.get("createdAt"), end));
    }

    /**
     * {@code q} : réf (avec ou sans {@code #} / {@code SC-}), nom et adresse (insensibles à la casse),
     * chiffres du téléphone.
     */
    static Specification<CustomerOrder> search(String raw) {
        return (root, query, cb) -> {
            if (raw == null || raw.isBlank()) {
                return null;
            }
            String q = raw.trim();
            List<Predicate> any = new ArrayList<>();
            String refPart = q.replaceFirst("^#", "").toUpperCase(Locale.ROOT).replaceFirst("^SC-?", "");
            if (!refPart.isEmpty() && refPart.matches("[0-9]+")) {
                any.add(cb.like(root.get("ref"), "SC-" + refPart + "%"));
            }
            String like = "%" + escape(q.toLowerCase(Locale.ROOT)) + "%";
            any.add(cb.like(cb.lower(root.get("customerName")), like, '\\'));
            any.add(cb.like(cb.lower(root.get("address")), like, '\\'));
            String digits = q.replaceAll("\\D", "");
            if (digits.length() >= 3 && digits.length() == q.replaceAll("[\\s+#-]", "").length()) {
                any.add(cb.like(root.get("phoneE164"), "%" + digits + "%"));
            }
            return cb.or(any.toArray(Predicate[]::new));
        };
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
