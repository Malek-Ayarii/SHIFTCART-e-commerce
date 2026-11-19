package com.nexoshift.catalog;

import com.nexoshift.catalog.CatalogDtos.Hotspot;
import com.nexoshift.catalog.CatalogDtos.PackItem;
import com.nexoshift.catalog.CatalogDtos.ProductAdmin;
import com.nexoshift.catalog.CatalogDtos.ProductPublic;
import com.nexoshift.common.money.Money;
import com.nexoshift.common.time.MonthRange;
import com.nexoshift.media.MediaDto;
import com.nexoshift.media.MediaStore;
import com.nexoshift.media.MediaStore.MediaMeta;
import com.nexoshift.order.Product;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Assemble les vues {@code ProductPublic} / {@code ProductAdmin} : photo principale, galerie, composition
 * (pièces + points d'intérêt), disponibilité. Quelques requêtes groupées, jamais les octets des photos.
 */
@Component
public class CatalogReader {

    private final NamedParameterJdbcTemplate jdbc;
    private final MediaStore media;
    private final Clock clock;

    public CatalogReader(NamedParameterJdbcTemplate jdbc, MediaStore media, Clock clock) {
        this.jdbc = jdbc;
        this.media = media;
        this.clock = clock;
    }

    /** Ligne de nomenclature (pièce d'un pack) avec le stock de la pièce. */
    public record BomRow(long productId, long stockItemId, String name, String description, Long photoMediaId,
            int stockQuantity, int perPack, boolean gift, BigDecimal hotspotX, BigDecimal hotspotY) {}

    public List<BomRow> bom(Set<Long> productIds) {
        if (productIds.isEmpty()) {
            return List.of();
        }
        return jdbc.query("""
                SELECT b.product_id, b.stock_item_id, s.name, s.description, s.photo_media_id, s.quantity AS stock_qty,
                       b.quantity, b.gift, b.hotspot_x, b.hotspot_y
                FROM pack_bom b JOIN stock_item s ON s.id = b.stock_item_id
                WHERE b.product_id IN (:ids)
                ORDER BY b.product_id, b.sort_order, s.sort_order, s.id
                """,
                new MapSqlParameterSource("ids", productIds),
                (rs, i) -> new BomRow(rs.getLong("product_id"), rs.getLong("stock_item_id"), rs.getString("name"),
                        rs.getString("description"), rs.getObject("photo_media_id", Long.class),
                        rs.getInt("stock_qty"), rs.getInt("quantity"), rs.getBoolean("gift"),
                        rs.getBigDecimal("hotspot_x"), rs.getBigDecimal("hotspot_y")));
    }

    /** Packs assemblables = min(stock de la pièce ÷ quantité par pack) ; 0 sans composition. */
    public static int assemblable(List<BomRow> rows) {
        int min = Integer.MAX_VALUE;
        for (BomRow r : rows) {
            if (r.perPack() > 0) {
                min = Math.min(min, r.stockQuantity() / r.perPack());
            }
        }
        return min == Integer.MAX_VALUE ? 0 : min;
    }

    public List<ProductPublic> toPublic(List<Product> products) {
        return build(products).stream().map(Built::pub).toList();
    }

    public ProductPublic toPublic(Product product) {
        return toPublic(List.of(product)).get(0);
    }

    public List<ProductAdmin> toAdmin(List<Product> products) {
        Map<Long, Long> monthOrders = ordersThisMonth();
        return build(products).stream()
                .map(b -> new ProductAdmin(b.pub(), b.product().isActive(), b.product().getCreatedAt(),
                        b.product().getUpdatedAt(), b.product().getAssembledStock(), b.assemblable(),
                        monthOrders.getOrDefault(b.product().getId(), 0L)))
                .toList();
    }

    public ProductAdmin toAdmin(Product product) {
        return toAdmin(List.of(product)).get(0);
    }

    private record Built(Product product, ProductPublic pub, int assemblable) {}

    private List<Built> build(List<Product> products) {
        Set<Long> ids = new HashSet<>();
        products.forEach(p -> ids.add(p.getId()));
        Map<Long, List<BomRow>> bomByProduct = new HashMap<>();
        for (BomRow r : bom(ids)) {
            bomByProduct.computeIfAbsent(r.productId(), k -> new ArrayList<>()).add(r);
        }
        Map<Long, List<Long>> galleryByProduct = new LinkedHashMap<>();
        if (!ids.isEmpty()) {
            jdbc.query("SELECT product_id, media_id FROM product_media WHERE product_id IN (:ids) "
                            + "ORDER BY product_id, position, media_id",
                    new MapSqlParameterSource("ids", ids),
                    rs -> {
                        galleryByProduct.computeIfAbsent(rs.getLong(1), k -> new ArrayList<>()).add(rs.getLong(2));
                    });
        }
        Set<Long> mediaIds = new HashSet<>();
        products.stream().map(Product::getCoverMediaId).filter(Objects::nonNull).forEach(mediaIds::add);
        galleryByProduct.values().forEach(mediaIds::addAll);
        bomByProduct.values().forEach(rows -> rows.stream().map(BomRow::photoMediaId).filter(Objects::nonNull)
                .forEach(mediaIds::add));
        Map<Long, MediaMeta> metas = media.findAll(mediaIds);

        List<Built> out = new ArrayList<>(products.size());
        for (Product p : products) {
            List<BomRow> rows = bomByProduct.getOrDefault(p.getId(), List.of());
            int assemblable = assemblable(rows);
            List<PackItem> items = rows.stream()
                    .map(r -> new PackItem(r.stockItemId(), r.stockItemId(), r.name(), r.description(), r.perPack(),
                            r.gift(), dto(metas, r.photoMediaId()),
                            r.hotspotX() == null || r.hotspotY() == null ? null
                                    : new Hotspot(Money.clean(r.hotspotX()), Money.clean(r.hotspotY()))))
                    .toList();
            List<MediaDto> gallery = galleryByProduct.getOrDefault(p.getId(), List.of()).stream()
                    .map(id -> dto(metas, id)).filter(Objects::nonNull).toList();
            String availability = p.getAssembledStock() > 0 || assemblable > 0
                    ? CatalogDtos.IN_STOCK : CatalogDtos.MADE_TO_ORDER;
            ProductPublic pub = new ProductPublic(p.getId(), p.getSlug(), p.getSku(), p.getName(), p.getBadge(),
                    p.getTagline(), p.getAudience(), p.getDescription(), Money.toTnd(p.getPriceMillimes()),
                    p.isFeatured(), p.getSortOrder(), dto(metas, p.getCoverMediaId()), gallery, items,
                    cleanSavings(p.getSavings()), availability);
            out.add(new Built(p, pub, assemblable));
        }
        return out;
    }

    private Map<Long, Long> ordersThisMonth() {
        MonthRange month = MonthRange.parseOrCurrent(null, clock);
        Map<Long, Long> out = new HashMap<>();
        jdbc.query("SELECT product_id, count(*) FROM customer_order WHERE created_at >= :start AND created_at < :end "
                        + "GROUP BY product_id",
                new MapSqlParameterSource()
                        .addValue("start", Timestamp.from(month.start()))
                        .addValue("end", Timestamp.from(month.end())),
                rs -> {
                    out.put(rs.getLong(1), rs.getLong(2));
                });
        return out;
    }

    private static MediaDto dto(Map<Long, MediaMeta> metas, Long id) {
        if (id == null) {
            return null;
        }
        MediaMeta m = metas.get(id);
        return m == null ? null : m.toDto();
    }

    static Savings cleanSavings(Savings s) {
        if (s == null) {
            return null;
        }
        return new Savings(s.title(), s.question(), Money.clean(s.min()), Money.clean(s.max()), Money.clean(s.step()),
                Money.clean(s.defaultValue()), Money.clean(s.homeCostPerDay()), s.daysPerMonth());
    }
}
