package com.nexoshift.stock;

import com.nexoshift.common.config.AppProperties;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.error.ValidationException;
import com.nexoshift.common.money.Money;
import com.nexoshift.media.MediaDto;
import com.nexoshift.media.MediaStore;
import com.nexoshift.media.MediaStore.MediaMeta;
import com.nexoshift.order.Product;
import com.nexoshift.order.ProductRepository;
import com.nexoshift.stock.StockDtos.ItemCreate;
import com.nexoshift.stock.StockDtos.ItemDto;
import com.nexoshift.stock.StockDtos.ItemPatch;
import com.nexoshift.stock.StockDtos.PackDto;
import com.nexoshift.stock.StockDtos.StockResponse;
import com.nexoshift.stock.StockDtos.UsedIn;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stock v2 : pièces (coût, quantité, seuil, photo, packs qui l'utilisent) et chiffres par pack — packs complets
 * ({@code product.assembled_stock}), assemblables (min des pièces ÷ nomenclature), COGS et marge
 * (prix − COGS − frais transporteur {@code CARRIER_FEE_TND}, [À DÉFINIR]).
 * Alerte d'un pack = pack <b>actif</b> sous le seuil {@code PACK_ALERT_THRESHOLD} ; alerte globale = au moins une.
 */
@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final StockItemRepository items;
    private final ProductRepository products;
    private final MediaStore media;
    private final AppProperties props;

    public StockService(StockItemRepository items, ProductRepository products, MediaStore media,
            AppProperties props) {
        this.items = items;
        this.products = products;
        this.media = media;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public StockResponse get() {
        return build();
    }

    @Transactional
    public StockResponse patch(StockDtos.StockPatch body) {
        if (body == null || body.items() == null) {
            throw ValidationException.of("items", "Aucune pièce à modifier.");
        }
        List<StockItem> all = items.findAllForUpdate();
        Map<Long, StockItem> byId = all.stream().collect(Collectors.toMap(StockItem::getId, Function.identity()));
        Map<String, String> errors = new LinkedHashMap<>();
        for (int i = 0; i < body.items().size(); i++) {
            ItemPatch p = body.items().get(i);
            String prefix = "items[" + i + "].";
            if (p == null || p.getId() == null || !byId.containsKey(p.getId())) {
                errors.put(prefix + "id", "Pièce introuvable.");
                continue;
            }
            if (p.getName() != null) {
                String name = squash(p.getName());
                String err = nameError(name, p.getId(), all);
                if (err != null) {
                    errors.put(prefix + "name", err);
                }
            }
            if (p.isDescriptionSet() && p.getDescription() != null && p.getDescription().trim().length() > 500) {
                errors.put(prefix + "description", "Description trop longue (500 caractères max).");
            }
            if (p.isPhotoMediaIdSet() && p.getPhotoMediaId() != null && media.find(p.getPhotoMediaId()).isEmpty()) {
                errors.put(prefix + "photoMediaId", "Photo introuvable.");
            }
            checkNumbers(prefix, p.getQuantity(), p.getThreshold(), p.getUnitCostTnd(), errors);
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
        for (ItemPatch p : body.items()) {
            StockItem item = byId.get(p.getId());
            if (p.getName() != null) {
                item.setName(squash(p.getName()));
            }
            if (p.isDescriptionSet()) {
                item.setDescription(blankToNull(p.getDescription()));
            }
            if (p.isPhotoMediaIdSet()) {
                item.setPhotoMediaId(p.getPhotoMediaId());
            }
            if (p.getQuantity() != null) {
                item.setQuantity(p.getQuantity());
            }
            if (p.getThreshold() != null) {
                item.setThreshold(p.getThreshold());
            }
            if (p.getUnitCostTnd() != null) {
                item.setUnitCostMillimes(Money.toMillimes(p.getUnitCostTnd()));
            }
        }
        items.flush();
        return build();
    }

    @Transactional
    public StockResponse create(ItemCreate body) {
        if (body == null) {
            throw ValidationException.of("name", "Donne un nom à cette pièce.");
        }
        List<StockItem> all = items.findAllForUpdate();
        Map<String, String> errors = new LinkedHashMap<>();
        String name = squash(body.name());
        String nameErr = nameError(name, -1L, all);
        if (nameErr != null) {
            errors.put("name", nameErr);
        }
        String description = blankToNull(body.description());
        if (description != null && description.length() > 500) {
            errors.put("description", "Description trop longue (500 caractères max).");
        }
        if (body.photoMediaId() != null && media.find(body.photoMediaId()).isEmpty()) {
            errors.put("photoMediaId", "Photo introuvable.");
        }
        if (body.unitCostTnd() == null) {
            errors.put("unitCostTnd", "Indique un coût (0 s'il n'est pas encore connu).");
        }
        if (body.quantity() == null) {
            errors.put("quantity", "Indique la quantité en stock.");
        }
        if (body.threshold() == null) {
            errors.put("threshold", "Indique un seuil d'alerte.");
        }
        checkNumbers("", body.quantity(), body.threshold(), body.unitCostTnd(), errors);
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
        StockItem item = new StockItem(name, items.maxSortOrder() + 1);
        item.setDescription(description);
        item.setPhotoMediaId(body.photoMediaId());
        item.setUnitCostMillimes(Money.toMillimes(body.unitCostTnd()));
        item.setQuantity(body.quantity());
        item.setThreshold(body.threshold());
        items.saveAndFlush(item);
        log.info("Stock item {} created", item.getId());
        return build();
    }

    @Transactional
    public void delete(long id) {
        StockItem item = items.findById(id).orElseThrow(() -> ApiException.notFound("Pièce introuvable."));
        if (items.usageCount(id) > 0) {
            throw ApiException.conflict("ITEM_IN_USE", "Cette pièce est utilisée dans un pack.");
        }
        items.delete(item);
        items.flush();
        log.info("Stock item {} deleted", id);
    }

    /** Assemble {@code packs} packs d'un produit : décrémente ses pièces, incrémente ses packs complets ; 409 si insuffisant. */
    @Transactional
    public StockResponse assemble(Long productId, Integer packs) {
        if (productId == null) {
            throw ValidationException.of("productId", "Choisis le pack à assembler.");
        }
        if (packs == null || packs < 1 || packs > 10_000) {
            throw ValidationException.of("packs", "Indique un nombre de packs entre 1 et 10 000.");
        }
        Product product = products.findByIdForUpdate(productId)
                .orElseThrow(() -> ApiException.notFound("Pack introuvable."));
        Map<Long, Integer> bom = new HashMap<>();
        for (Object[] row : items.bomFor(product.getId())) {
            bom.put(((Number) row[0]).longValue(), ((Number) row[1]).intValue());
        }
        if (bom.isEmpty()) {
            throw ValidationException.of("productId", "Ce pack n'a encore aucune pièce dans sa composition.");
        }
        List<StockItem> all = items.findAllForUpdate();
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
        log.info("Assembled {} packs of product {} ({} complete packs now)", packs, product.getId(),
                product.getAssembledStock());
        items.flush();
        products.flush();
        return build();
    }

    // ------------------------------------------------------------------------------------------

    private record Bom(long productId, long itemId, int perPack) {}

    private StockResponse build() {
        List<StockItem> all = items.findAllByOrderBySortOrderAscIdAsc();
        List<Product> packs = products.findAllByOrderBySortOrderAscIdAsc();
        List<Bom> bom = items.allBom().stream()
                .map(r -> new Bom(((Number) r[0]).longValue(), ((Number) r[1]).longValue(),
                        ((Number) r[2]).intValue()))
                .toList();
        Map<Long, StockItem> itemById = all.stream().collect(Collectors.toMap(StockItem::getId, Function.identity()));
        Map<Long, Product> productById = new LinkedHashMap<>();
        packs.forEach(p -> productById.put(p.getId(), p));

        Set<Long> mediaIds = new HashSet<>();
        all.stream().map(StockItem::getPhotoMediaId).filter(Objects::nonNull).forEach(mediaIds::add);
        packs.stream().map(Product::getCoverMediaId).filter(Objects::nonNull).forEach(mediaIds::add);
        Map<Long, MediaMeta> metas = media.findAll(mediaIds);

        Map<Long, List<UsedIn>> usedIn = new HashMap<>();
        Map<Long, List<Bom>> bomByProduct = new HashMap<>();
        for (Bom b : bom) {
            Product p = productById.get(b.productId());
            if (p != null) {
                usedIn.computeIfAbsent(b.itemId(), k -> new ArrayList<>())
                        .add(new UsedIn(p.getId(), p.getName(), b.perPack()));
            }
            bomByProduct.computeIfAbsent(b.productId(), k -> new ArrayList<>()).add(b);
        }
        // Ordre stable des « packs qui l'utilisent » : celui du catalogue.
        List<Long> productOrder = new ArrayList<>(productById.keySet());
        usedIn.values().forEach(l -> l.sort((a, c) -> Integer.compare(productOrder.indexOf(a.productId()),
                productOrder.indexOf(c.productId()))));

        List<ItemDto> itemDtos = all.stream()
                .map(i -> new ItemDto(i.getId(), i.getName(), i.getDescription(), dto(metas, i.getPhotoMediaId()),
                        Money.toTnd(i.getUnitCostMillimes()), i.getQuantity(), i.getThreshold(),
                        i.getQuantity() < i.getThreshold() ? "LOW" : "OK",
                        usedIn.getOrDefault(i.getId(), List.of())))
                .toList();

        long carrierFee = Money.toMillimes(props.carrierFeeTnd());
        int threshold = props.packAlertThreshold();
        boolean anyAlert = false;
        List<PackDto> packDtos = new ArrayList<>();
        for (Product p : packs) {
            long cogs = 0;
            int assemblable = Integer.MAX_VALUE;
            for (Bom b : bomByProduct.getOrDefault(p.getId(), List.of())) {
                StockItem item = itemById.get(b.itemId());
                if (item == null || b.perPack() <= 0) {
                    continue;
                }
                cogs += item.getUnitCostMillimes() * b.perPack();
                assemblable = Math.min(assemblable, item.getQuantity() / b.perPack());
            }
            if (assemblable == Integer.MAX_VALUE) {
                assemblable = 0;
            }
            long price = p.getPriceMillimes();
            long margin = price - cogs - carrierFee;
            BigDecimal marginPct = price == 0 ? BigDecimal.ZERO
                    : BigDecimal.valueOf(margin * 100).divide(BigDecimal.valueOf(price), 1, RoundingMode.HALF_UP);
            boolean alert = p.isActive() && p.getAssembledStock() < threshold;
            anyAlert |= alert;
            packDtos.add(new PackDto(p.getId(), p.getName(), p.getSlug(), p.isActive(), dto(metas, p.getCoverMediaId()),
                    p.getAssembledStock(), assemblable, threshold, alert, Money.toTnd(price), Money.toTnd(cogs),
                    Money.toTnd(carrierFee), Money.toTnd(margin), Money.clean(marginPct)));
        }
        return new StockResponse(itemDtos, packDtos, anyAlert, Money.toTnd(carrierFee));
    }

    private static void checkNumbers(String prefix, Integer quantity, Integer threshold, BigDecimal cost,
            Map<String, String> errors) {
        if (quantity != null && quantity < 0) {
            errors.put(prefix + "quantity", "La quantité ne peut pas être négative.");
        }
        if (threshold != null && threshold < 0) {
            errors.put(prefix + "threshold", "Le seuil ne peut pas être négatif.");
        }
        if (cost != null && (cost.signum() < 0 || cost.stripTrailingZeros().scale() > 3
                || cost.compareTo(BigDecimal.valueOf(1_000_000)) > 0)) {
            errors.put(prefix + "unitCostTnd", "Coût invalide (positif, 3 décimales max).");
        }
    }

    private static String nameError(String name, Long selfId, List<StockItem> all) {
        if (name == null || name.length() < 2 || name.length() > 120) {
            return "Le nom doit faire entre 2 et 120 caractères.";
        }
        String lower = name.toLowerCase(Locale.ROOT);
        boolean taken = all.stream().anyMatch(i -> !i.getId().equals(selfId)
                && i.getName().toLowerCase(Locale.ROOT).equals(lower));
        return taken ? "Une pièce porte déjà ce nom." : null;
    }

    private static MediaDto dto(Map<Long, MediaMeta> metas, Long id) {
        MediaMeta m = id == null ? null : metas.get(id);
        return m == null ? null : m.toDto();
    }

    private static String squash(String s) {
        return s == null || s.isBlank() ? null : s.trim().replaceAll("\\s+", " ");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
