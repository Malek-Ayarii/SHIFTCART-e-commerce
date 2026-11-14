package com.shiftcart.order;

import com.shiftcart.common.error.ApiException;
import com.shiftcart.common.error.ValidationException;
import com.shiftcart.common.money.Money;
import com.shiftcart.common.phone.TnPhone;
import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.ratelimit.RateLimiters;
import com.shiftcart.order.dto.CreateOrderRequest;
import com.shiftcart.order.dto.OrderCreatedResponse;
import com.shiftcart.whatsapp.WhatsAppLinks;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Création des commandes depuis la boutique. */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    /** Réf renvoyée aux robots qui remplissent le honeypot (rien n'est enregistré). */
    public static final String HONEYPOT_REF = "SC-0000";

    /** Ordre d'affichage des erreurs par champ. */
    private static final List<String> FIELD_ORDER = List.of("customerName", "phone", "governorate", "quantity");

    private final OrderRepository orders;
    private final OrderEventRepository events;
    private final ProductRepository products;
    private final TrackingTokenService tokens;
    private final WhatsAppLinks waLinks;
    private final RateLimiters rateLimiters;
    private final Validator validator;
    private final AppProperties props;
    private final Clock clock;

    public OrderService(OrderRepository orders, OrderEventRepository events, ProductRepository products,
            TrackingTokenService tokens, WhatsAppLinks waLinks, RateLimiters rateLimiters, Validator validator,
            AppProperties props, Clock clock) {
        this.orders = orders;
        this.events = events;
        this.products = products;
        this.tokens = tokens;
        this.waLinks = waLinks;
        this.rateLimiters = rateLimiters;
        this.validator = validator;
        this.props = props;
        this.clock = clock;
    }

    /** Résultat : la commande et si elle vient d'être créée (201) ou est un doublon (200). */
    public record Result(OrderCreatedResponse body, boolean created) {}

    /**
     * Ordre des contrôles : limite par IP → honeypot → validation (422) → anti-doublon (200)
     * → limite par téléphone (429) → création (201).
     */
    @Transactional
    public Result create(CreateOrderRequest req, String clientIp) {
        if (!rateLimiters.orderByIp().tryAcquire(clientIp)) {
            log.info("Order rate-limited by IP");
            throw ApiException.rateLimited();
        }
        Product product = products.findBySku(req.skuOrDefault()).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Ce produit n'est plus disponible."));

        if (req.website() != null && !req.website().isBlank()) {
            log.info("Honeypot filled: fake order returned, nothing stored");
            return new Result(honeypotResponse(req, product), true);
        }

        validate(req);

        String phone = TnPhone.toE164(req.phone());
        orders.lockForCreation("order:" + phone);
        Instant now = clock.instant();
        List<CustomerOrder> duplicates = orders.findRecentDuplicates(
                phone, product.getId(), now.minus(props.duplicateWindow()), Limit.of(1));
        if (!duplicates.isEmpty()) {
            CustomerOrder existing = duplicates.get(0);
            log.info("Duplicate order for {} within window: returning {}", TnPhone.mask(phone), existing.getRef());
            return new Result(toResponse(existing, tokens.tokenFor(existing.getRef())), false);
        }

        if (!rateLimiters.orderByPhone().tryAcquire(phone)) {
            log.info("Order rate-limited for phone {}", TnPhone.mask(phone));
            throw ApiException.rateLimited();
        }

        String ref = "SC-" + orders.nextRefNumber();
        CustomerOrder order = new CustomerOrder(ref, product, req.quantityOrDefault(),
                req.customerName().trim().replaceAll("\\s+", " "), phone, req.governorate(), now);
        if (req.source() != null) {
            order.setSource(trim100(req.source().utmSource()), trim100(req.source().utmCampaign()),
                    trim100(req.source().utmContent()));
        }
        String token = tokens.tokenFor(ref);
        order.setTrackingTokenHash(tokens.hashOf(token));
        orders.save(order);
        events.save(new OrderEvent(order.getId(), null, OrderStatus.NEW, OrderEvent.ACTOR_CUSTOMER, null, now));
        log.info("Order {} created for {} ({})", ref, TnPhone.mask(phone), order.getGovernorate());
        return new Result(toResponse(order, token), true);
    }

    private void validate(CreateOrderRequest req) {
        Set<ConstraintViolation<CreateOrderRequest>> violations = validator.validate(req);
        if (violations.isEmpty()) {
            return;
        }
        Map<String, String> byField = new LinkedHashMap<>();
        for (ConstraintViolation<CreateOrderRequest> v : violations) {
            byField.putIfAbsent(v.getPropertyPath().toString(), v.getMessage());
        }
        Map<String, String> ordered = new LinkedHashMap<>();
        FIELD_ORDER.stream().filter(byField::containsKey).forEach(f -> ordered.put(f, byField.get(f)));
        byField.forEach(ordered::putIfAbsent);
        throw new ValidationException(ordered);
    }

    public OrderCreatedResponse toResponse(CustomerOrder order, String token) {
        return new OrderCreatedResponse(
                order.getRef(),
                Money.toTnd(order.getAmountMillimes()),
                order.getStatus().name(),
                order.getProduct().getName(),
                order.firstName(),
                TnPhone.display(order.getPhoneE164()),
                order.getGovernorate(),
                token,
                waLinks.confirmUrl(order.getRef()),
                tokens.trackingUrl(order.getRef(), token));
    }

    private OrderCreatedResponse honeypotResponse(CreateOrderRequest req, Product product) {
        String name = req.customerName() == null ? "" : req.customerName().trim();
        String first = name.contains(" ") ? name.substring(0, name.indexOf(' ')) : name;
        String token = tokens.tokenFor(HONEYPOT_REF);
        return new OrderCreatedResponse(HONEYPOT_REF, Money.toTnd(product.getPriceMillimes()), OrderStatus.NEW.name(),
                product.getName(), first, TnPhone.display(TnPhone.toE164(req.phone())), req.governorate(), token,
                waLinks.confirmUrl(HONEYPOT_REF), tokens.trackingUrl(HONEYPOT_REF, token));
    }

    private static String trim100(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String t = value.trim();
        return t.length() > 100 ? t.substring(0, 100) : t;
    }
}
