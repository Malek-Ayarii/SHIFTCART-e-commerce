package com.shiftcart.order;

import com.shiftcart.common.security.CurrentUser;
import com.shiftcart.order.dto.AdminOrderDtos.GenerateRequest;
import com.shiftcart.order.dto.AdminOrderDtos.GenerateResponse;
import com.shiftcart.order.dto.AdminOrderDtos.MessageDto;
import com.shiftcart.order.dto.AdminOrderDtos.OrderDetail;
import com.shiftcart.order.dto.AdminOrderDtos.OrderSummary;
import com.shiftcart.order.dto.AdminOrderDtos.PageResponse;
import com.shiftcart.order.dto.AdminOrderDtos.SendRequest;
import com.shiftcart.order.dto.AdminOrderDtos.StatusPatch;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final AdminOrderService service;
    private final DeliverySlipService slips;

    public AdminOrderController(AdminOrderService service, DeliverySlipService slips) {
        this.service = service;
        this.slips = slips;
    }

    @GetMapping
    public PageResponse<OrderSummary> list(
            @RequestParam(name = "status", required = false) List<String> status,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {
        return service.list(status, q, month, productId, page, size);
    }

    @GetMapping("/counts")
    public Map<String, Long> counts(@RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "productId", required = false) Long productId) {
        return service.counts(month, productId);
    }

    @GetMapping("/{id}")
    public OrderDetail detail(@PathVariable long id) {
        return service.detail(id);
    }

    @PatchMapping("/{id}/status")
    public OrderDetail changeStatus(@PathVariable long id, @RequestBody StatusPatch body) {
        return service.changeStatus(id, body, OrderEvent.agentActor(CurrentUser.id()));
    }

    @PostMapping("/{id}/messages/generate")
    public GenerateResponse generate(@PathVariable long id, @RequestBody GenerateRequest body) {
        return new GenerateResponse(service.generateMessage(id, body.tone()));
    }

    @PostMapping("/{id}/messages/send")
    public MessageDto send(@PathVariable long id, @RequestBody SendRequest body) {
        return service.sendMessage(id, body.body(), body.tone());
    }

    @GetMapping(value = "/{id}/delivery-slip.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> deliverySlip(@PathVariable long id) {
        CustomerOrder order = service.load(id);
        byte[] pdf = slips.render(order);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename("bon-livraison-" + order.getRef() + ".pdf").build().toString())
                .body(pdf);
    }
}
