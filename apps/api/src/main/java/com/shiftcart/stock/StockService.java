package com.shiftcart.stock;

import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.error.ApiException;
import com.shiftcart.common.error.ValidationException;
import com.shiftcart.common.money.Money;
import com.shiftcart.order.Product;
import com.shiftcart.order.ProductRepository;
import com.shiftcart.stock.StockDtos.ItemDto;
import com.shiftcart.stock.StockDtos.ItemPatch;
import com.shiftcart.stock.StockDtos.StockResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stock du Pack Barista : pièces, coûts, seuils, packs assemblables (min des pièces ÷ nomenclature),
 * packs complets ({@code product.assembled_stock}), COGS et marge.
 * Marge par pack = prix − COGS − frais transporteur ({@code CARRIER_FEE_TND}, [À DÉFINIR]).
 */
@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);
    public static final String PACK_SKU = "PACK-BARISTA";

    private final StockItemRepository items;
    private final ProductRepository products;
    private final AppProperties props;

    public StockService(StockItemRepository items, ProductRepository products, AppProperties props) {
        this.items = items;
        this.products = products;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public StockResponse get() {
        Product product = pack(false);
        return build(product, items.findAllByOrderBySortOrderAscIdAsc());
    }

    @Transactional
    public StockResponse patch(StockDtos.StockPatch body) {
        if (body == null || body.items() == null) {
            throw ValidationException.of("items", "Aucune pièce à modifier.");
        }
        Map<Long, StockItem> byId = items.findAllForUpdate().stream()
                .collect(Collectors.toMap(StockItem::getId, Function.identity()));
        Map<String, String> errors = new LinkedHashMap<>();
        for (int i = 0; i < body.items().size(); i++) {
            ItemPatch p = body.items().get(i);
            String prefix = "items[" + i + "].";
            if (p == null || p.id() == null || !byId.containsKey(p.id())) {
                errors.put(prefix + "id", "Pièce introuvable.");
                continue;
            }
            if (p.quantity() != null && p.quantity() < 0) {
                errors.put(prefix + "quantity", "La quantité ne peut pas être négative.");
            }
            if (p.threshold() != null && p.threshold() < 0) {
                errors.put(prefix + "threshold", "Le seuil ne peut pas être négatif.");
            }
            if (p.unitCostTnd() != null && (p.unitCostTnd().signum() < 0
                    || p.unitCostTnd().stripTrailingZeros().scale() > 3)) {
                errors.put(prefix + "unitCostTnd", "Coût invalide (positif, 3 décimales max).");
            }
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
        for (ItemPatch p : body.items()) {
            StockItem item = byId.get(p.id());
            if (p.quantity() != null) {
                item.setQuantity(p.quantity());
            }
            if (p.threshold() != null) {
                item.setThreshold(p.threshold());
            }
            if (p.unitCostTnd() != null) {
                item.setUnitCostMillimes(Money.toMillimes(p.unitCostTnd()));
            }
        }
        items.flush();
        return build(pack(false), items.findAllByOrderBySortOrderAscIdAsc());
    }

    /** Assemble {@code packs} packs : décrémente les pièces, incrémente les packs complets ; 409 si insuffisant. */
    @Transactional
    public StockResponse assemble(Integer packs) {
        if (packs == null || packs < 1 || packs > 10_000) {
            throw ValidationException.of("packs", "Indique un nombre de packs entre 1 et 10 000.");
        }
        Product product = pack(true);
        List<StockItem> all = items.findAllForUpdate();
        Map<Long, Integer> bom = bom(product);
        for (StockItem item : all) {
            int per = bom.getOrDefault(item.getId(), 0);
            if (per > 0 && item.getQuantity() < per * packs) {
                throw ApiException.conflict("INSUFFICIENT_STOCK",
                        "Pas assez de pièces : " + item.getName() + " (" + item.getQuantity() + " en stock, "
                                + per * packs + " nécessaires).");
            }
        }
        for (StockItem item : all) {
            int per = bom.getOrDefault(item.getId(), 0);
            if (per > 0) {
                item.setQuantity(item.getQuantity() - per * packs);
            }
        }
        product.setAssembledStock(product.getAssembledStock() + packs);
        log.info("Assembled {} packs ({} complete packs now)", packs, product.getAssembledStock());
        items.flush();
        return build(product, all);
    }

    private StockResponse build(Product product, List<StockItem> all) {
        Map<Long, Integer> bom = bom(product);
        List<ItemDto> dtos = new ArrayList<>();
        long cogs = 0;
        int assemblable = Integer.MAX_VALUE;
        boolean anyBom = false;
        for (StockItem item : all) {
            int per = bom.getOrDefault(item.getId(), 0);
            if (per > 0) {
                anyBom = true;
                cogs += item.getUnitCostMillimes() * per;
                assemblable = Math.min(assemblable, item.getQuantity() / per);
            }
            dtos.add(new ItemDto(item.getId(), item.getName(), Money.toTnd(item.getUnitCostMillimes()),
                    item.getQuantity(), item.getThreshold(), per,
                    item.getQuantity() < item.getThreshold() ? "LOW" : "OK"));
        }
        if (!anyBom) {
            assemblable = 0;
        }
        long price = product.getPriceMillimes();
        long carrierFee = Money.toMillimes(props.carrierFeeTnd());
        long margin = price - cogs - carrierFee;
        BigDecimal marginPct = price == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(margin * 100).divide(BigDecimal.valueOf(price), 1, RoundingMode.HALF_UP);
        int threshold = props.packAlertThreshold();
        return new StockResponse(dtos, product.getAssembledStock(), threshold, product.getAssembledStock() < threshold,
                assemblable, Money.toTnd(price), Money.toTnd(cogs), Money.toTnd(carrierFee), Money.toTnd(margin),
                Money.clean(marginPct));
    }

    private Map<Long, Integer> bom(Product product) {
        Map<Long, Integer> bom = new HashMap<>();
        for (Object[] row : items.bomFor(product.getId())) {
            bom.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
        }
        return bom;
    }

    private Product pack(boolean forUpdate) {
        return (forUpdate ? products.findBySkuForUpdate(PACK_SKU) : products.findBySku(PACK_SKU))
                .orElseThrow(() -> ApiException.notFound("Produit " + PACK_SKU + " introuvable."));
    }
}
