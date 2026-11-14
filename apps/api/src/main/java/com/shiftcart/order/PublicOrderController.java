package com.shiftcart.order;

import com.shiftcart.common.web.ClientIp;
import com.shiftcart.order.dto.CreateOrderRequest;
import com.shiftcart.order.dto.OrderCreatedResponse;
import com.shiftcart.order.dto.TrackingResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints publics de la boutique. */
@RestController
@RequestMapping("/api/orders")
public class PublicOrderController {

    private final OrderService orderService;
    private final TrackingService trackingService;

    public PublicOrderController(OrderService orderService, TrackingService trackingService) {
        this.orderService = orderService;
        this.trackingService = trackingService;
    }

    /** 201 nouvelle commande · 200 doublon (30 min) · 422 validation · 429 trop de tentatives. */
    @PostMapping
    public ResponseEntity<OrderCreatedResponse> create(@RequestBody CreateOrderRequest body,
            HttpServletRequest request) {
        OrderService.Result result = orderService.create(body, ClientIp.of(request));
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .cacheControl(CacheControl.noStore())
                .body(result.body());
    }

    /** 403 jeton invalide · 404 réf inconnue. */
    @GetMapping("/{ref}/tracking")
    public ResponseEntity<TrackingResponse> tracking(@PathVariable String ref,
            @RequestParam(name = "t", required = false) String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(trackingService.track(ref, token));
    }
}
