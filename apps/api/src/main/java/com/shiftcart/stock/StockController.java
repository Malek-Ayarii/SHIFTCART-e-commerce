package com.shiftcart.stock;

import com.shiftcart.stock.StockDtos.AssembleRequest;
import com.shiftcart.stock.StockDtos.StockPatch;
import com.shiftcart.stock.StockDtos.StockResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/stock")
public class StockController {

    private final StockService stock;

    public StockController(StockService stock) {
        this.stock = stock;
    }

    @GetMapping
    public StockResponse get() {
        return stock.get();
    }

    @PatchMapping
    public StockResponse patch(@RequestBody StockPatch body) {
        return stock.patch(body);
    }

    @PostMapping("/assemble")
    public StockResponse assemble(@RequestBody AssembleRequest body) {
        return stock.assemble(body.packs());
    }
}
