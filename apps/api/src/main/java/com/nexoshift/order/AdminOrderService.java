package com.nexoshift.order;

import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.error.ValidationException;
import com.nexoshift.common.money.Money;
import com.nexoshift.common.phone.TnPhone;
import com.nexoshift.common.time.MonthRange;
import com.nexoshift.media.MediaDto;
import com.nexoshift.messages.Message;
import com.nexoshift.messages.MessageContext;
import com.nexoshift.messages.MessageGenerator;
import com.nexoshift.messages.MessageRepository;
import com.nexoshift.messages.MessageService;
import com.nexoshift.messages.Tone;
import com.nexoshift.order.dto.AdminOrderDtos.EventDto;
import com.nexoshift.order.dto.AdminOrderDtos.MessageDto;
import com.nexoshift.order.dto.AdminOrderDtos.OrderDetail;
import com.nexoshift.order.dto.AdminOrderDtos.OrderSummary;
import com.nexoshift.order.dto.AdminOrderDtos.PageResponse;
import com.nexoshift.order.dto.AdminOrderDtos.StatusPatch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Back-office : liste, compteurs, détail, statut, messages. */
@Service
public class AdminOrderService {

    public static final int MAX_PAGE_SIZE = 200;

    private final OrderRepository orders;
    private final OrderEventRepository events;
    private final MessageRepository messages;
    private final OrderWorkflow workflow;
    private final MessageGenerator generator;
    private final MessageService messageService;

    public AdminOrderService(OrderRepository orders, OrderEventRepository events, MessageRepository messages,
            OrderWorkflow workflow, MessageGenerator generator, MessageService messageService) {
        this.orders = orders;
        this.events = events;
        this.messages = messages;
        this.workflow = workflow;
        this.generator = generator;
        this.messageService = messageService;
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> list(List<String> statuses, String q, String month, Long productId, int page,
            int size) {
        return list(statuses, q, month, productId, null, page, size);
    }

    /** {@code day} ({@code AAAA-MM-JJ}, heure de Tunis) restreint à une journée — vue Jour de l'agenda. */
    @Transactional(readOnly = true)
    public PageResponse<OrderSummary> list(List<String> statuses, String q, String month, Long productId, String day,
            int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw ApiException.badRequest("Pagination invalide (size entre 1 et " + MAX_PAGE_SIZE + ").");
        }
        List<OrderStatus> parsed = parseStatuses(statuses);
        MonthRange range = MonthRange.parseOptional(month);
        Instant[] dayRange = parseDay(day);
        Specification<CustomerOrder> spec = Specification.allOf(
                OrderSpecifications.statusIn(parsed),
                range == null ? OrderSpecifications.createdBetween(null, null)
                        : OrderSpecifications.createdBetween(range.start(), range.end()),
                dayRange == null ? OrderSpecifications.createdBetween(null, null)
                        : OrderSpecifications.createdBetween(dayRange[0], dayRange[1]),
                OrderSpecifications.productIs(productId),
                OrderSpecifications.search(q));
        Page<CustomerOrder> result = orders.findAll(spec,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        return new PageResponse<>(result.getContent().stream().map(AdminOrderService::summary).toList(),
                page, size, result.getTotalElements(), result.getTotalPages());
    }

    private static Instant[] parseDay(String day) {
        if (day == null || day.isBlank()) {
            return null;
        }
        try {
            java.time.LocalDate d = java.time.LocalDate.parse(day.trim());
            return new Instant[] {d.atStartOfDay(com.nexoshift.common.config.CoreConfig.TUNIS).toInstant(),
                    d.plusDays(1).atStartOfDay(com.nexoshift.common.config.CoreConfig.TUNIS).toInstant()};
        } catch (java.time.format.DateTimeParseException e) {
            throw ApiException.badRequest("Le jour doit être au format AAAA-MM-JJ.");
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Long> counts(String month, Long productId) {
        MonthRange range = MonthRange.parseOptional(month);
        Instant start = range == null ? Instant.EPOCH : range.start();
        Instant end = range == null ? Instant.parse("9999-12-31T00:00:00Z") : range.end();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) {
            counts.put(s.name(), 0L);
        }
        for (OrderRepository.StatusCount c : (productId == null ? orders.countByStatus(start, end)
                : orders.countByStatusForProduct(start, end, productId))) {
            counts.put(c.getStatus().name(), c.getTotal());
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public OrderDetail detail(long id) {
        return detail(load(id));
    }

    @Transactional
    public OrderDetail changeStatus(long id, StatusPatch patch, String actor) {
        if (patch == null || patch.status() == null || patch.status().isBlank()) {
            throw ValidationException.of("status", "Choisis un statut.");
        }
        OrderStatus target = parseStatus(patch.status());
        if (patch.carrier() != null && !patch.carrier().isBlank()
                && !Carriers.normalize(patch.carrier()).matches("[A-Z0-9_]{2,32}")) {
            throw ValidationException.of("carrier", "Transporteur invalide.");
        }
        if (patch.trackingNumber() != null && patch.trackingNumber().trim().length() > 64) {
            throw ValidationException.of("trackingNumber", "Numéro de suivi trop long (64 caractères max).");
        }
        CustomerOrder order = orders.findByIdForUpdate(id).orElseThrow(AdminOrderService::notFound);
        workflow.transition(order, target, actor, patch.carrier(), patch.trackingNumber(), patch.note());
        return detail(order);
    }

    @Transactional(readOnly = true)
    public String generateMessage(long id, String toneValue) {
        Tone tone = Tone.parse(toneValue)
                .orElseThrow(() -> ValidationException.of("tone", "Choisis un ton : amical, direct ou relance."));
        return generator.generate(tone, MessageContext.of(load(id)));
    }

    @Transactional
    public MessageDto sendMessage(long id, String body, String toneValue) {
        if (body == null || body.isBlank()) {
            throw ValidationException.of("body", "Écris un message avant de l’envoyer.");
        }
        if (body.length() > 1000) {
            throw ValidationException.of("body", "Message trop long (1000 caractères max).");
        }
        String tone = Tone.parse(toneValue).map(Tone::value).orElse(null);
        CustomerOrder order = load(id);
        return messageDto(messageService.sendToCustomer(order, body.trim(), tone));
    }

    @Transactional(readOnly = true)
    public CustomerOrder load(long id) {
        return orders.findById(id).orElseThrow(AdminOrderService::notFound);
    }

    private OrderDetail detail(CustomerOrder o) {
        List<EventDto> eventDtos = events.findByOrderIdOrderByCreatedAtAscIdAsc(o.getId()).stream()
                .map(e -> new EventDto(e.getId(), e.getFromStatus() == null ? null : e.getFromStatus().name(),
                        e.getToStatus().name(), e.getActor(), e.getNote(), e.getCreatedAt()))
                .toList();
        List<MessageDto> messageDtos = messages.findByOrderIdOrderByCreatedAtAscIdAsc(o.getId()).stream()
                .map(AdminOrderService::messageDto)
                .toList();
        return new OrderDetail(summary(o), o.getProduct().getSku(), o.getConfirmedAt(), o.getShippedAt(),
                o.getDeliveredAt(), o.getReturnedAt(), eventDtos, messageDtos,
                o.getStatus().allowedTransitions().stream().map(Enum::name).toList());
    }

    static OrderSummary summary(CustomerOrder o) {
        return new OrderSummary(o.getId(), o.getRef(), o.getCustomerName(), TnPhone.display(o.getPhoneE164()),
                o.getGovernorate(), o.getAddress(), o.getProduct().getId(), o.getProduct().getSlug(),
                o.getProduct().getName(), MediaDto.urlOf(o.getProduct().getCoverMediaId()), o.getQuantity(), Money.toTnd(o.getAmountMillimes()),
                o.getStatus().name(), o.getCarrier(), o.getTrackingNumber(), o.sourceLabel(), o.getCreatedAt());
    }

    static MessageDto messageDto(Message m) {
        return new MessageDto(m.getId(), m.getDirection(), m.getChannel(), m.getTone(), m.getBody(), m.getStatus(),
                m.getCreatedAt());
    }

    private static List<OrderStatus> parseStatuses(List<String> values) {
        List<OrderStatus> out = new ArrayList<>();
        if (values != null) {
            for (String v : values) {
                for (String part : v.split(",")) {
                    if (!part.isBlank()) {
                        out.add(parseStatusParam(part));
                    }
                }
            }
        }
        return out;
    }

    private static OrderStatus parseStatusParam(String value) {
        try {
            return OrderStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Statut inconnu : " + value.trim());
        }
    }

    private static OrderStatus parseStatus(String value) {
        try {
            return OrderStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ValidationException.of("status", "Statut inconnu.");
        }
    }

    private static ApiException notFound() {
        return ApiException.notFound("Commande introuvable.");
    }
}
