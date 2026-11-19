package com.nexoshift.catalog;

import com.nexoshift.catalog.CatalogDtos.Hotspot;
import com.nexoshift.catalog.CatalogDtos.ItemInput;
import com.nexoshift.catalog.CatalogDtos.ProductAdmin;
import com.nexoshift.catalog.CatalogDtos.ProductInput;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.error.ValidationException;
import com.nexoshift.common.money.Money;
import com.nexoshift.media.MediaStore;
import com.nexoshift.order.Product;
import com.nexoshift.order.ProductRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Back-office des packs : CRUD, ordre, photo principale, galerie, composition et points d'intérêt. */
@Service
public class AdminProductService {

    private static final Logger log = LoggerFactory.getLogger(AdminProductService.class);

    public static final String MSG_SLUG_TAKEN = "Ce lien est déjà utilisé par un autre pack.";
    public static final String MSG_PRICE_BEFORE_ACTIVE = "Fixe un prix avant d'activer ce pack.";
    private static final BigDecimal MAX_PRICE = BigDecimal.valueOf(100_000);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final ProductRepository products;
    private final CatalogReader reader;
    private final MediaStore media;
    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    public AdminProductService(ProductRepository products, CatalogReader reader, MediaStore media,
            NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.products = products;
        this.reader = reader;
        this.media = media;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ProductAdmin> list() {
        return reader.toAdmin(products.findAllByOrderBySortOrderAscIdAsc());
    }

    @Transactional(readOnly = true)
    public ProductAdmin get(long id) {
        return reader.toAdmin(load(id));
    }

    @Transactional
    public ProductAdmin create(ProductInput input) {
        Instant now = clock.instant();
        Validated v = validate(input, null);
        Product p = new Product(v.sku(), v.slug(), v.name(), now);
        apply(p, v);
        p.setSortOrder(products.maxSortOrder() + 1);
        p.setFeatured(false);
        products.saveAndFlush(p);
        applyFeatured(p, Boolean.TRUE.equals(input.featured()));
        log.info("Product {} created ({})", p.getId(), p.getSku());
        return reader.toAdmin(p);
    }

    @Transactional
    public ProductAdmin update(long id, ProductInput input) {
        Product p = loadForUpdate(id);
        Validated v = validate(input, p);
        p.setSlug(v.slug());
        p.setSku(v.sku());
        p.setName(v.name());
        apply(p, v);
        p.touch(clock.instant());
        products.saveAndFlush(p);
        if (input.featured() != null) {
            applyFeatured(p, input.featured());
        }
        log.info("Product {} updated", p.getId());
        return reader.toAdmin(p);
    }

    @Transactional
    public void delete(long id) {
        Product p = loadForUpdate(id);
        Long orders = jdbc.queryForObject("SELECT count(*) FROM customer_order WHERE product_id = :id",
                new MapSqlParameterSource("id", id), Long.class);
        if (orders != null && orders > 0) {
            throw ApiException.conflict("PRODUCT_HAS_ORDERS", "Ce pack a déjà des commandes : désactive-le plutôt.");
        }
        products.delete(p);
        products.flush();
        log.info("Product {} deleted", id);
    }

    @Transactional
    public void reorder(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw ValidationException.of("ids", "Indique l'ordre des packs.");
        }
        List<Product> all = new ArrayList<>(products.findAllByOrderBySortOrderAscIdAsc());
        Map<Long, Product> byId = new LinkedHashMap<>();
        all.forEach(p -> byId.put(p.getId(), p));
        Set<Long> seen = new LinkedHashSet<>();
        for (Long id : ids) {
            if (id == null || !byId.containsKey(id)) {
                throw ValidationException.of("ids", "Pack introuvable.");
            }
            seen.add(id);
        }
        int order = 0;
        Instant now = clock.instant();
        for (Long id : seen) {
            Product p = byId.get(id);
            p.setSortOrder(order++);
            p.touch(now);
        }
        for (Product p : all) {
            if (!seen.contains(p.getId())) {
                p.setSortOrder(order++);
            }
        }
        products.flush();
    }

    @Transactional
    public ProductAdmin setCover(long id, Long mediaId) {
        Product p = loadForUpdate(id);
        if (mediaId != null && media.find(mediaId).isEmpty()) {
            throw ValidationException.of("mediaId", "Photo introuvable.");
        }
        p.setCoverMediaId(mediaId);
        p.touch(clock.instant());
        products.flush();
        return reader.toAdmin(p);
    }

    @Transactional
    public ProductAdmin setGallery(long id, List<Long> mediaIds) {
        Product p = loadForUpdate(id);
        List<Long> ids = mediaIds == null ? List.of() : mediaIds;
        Set<Long> distinct = new LinkedHashSet<>();
        for (int i = 0; i < ids.size(); i++) {
            Long mid = ids.get(i);
            if (mid == null || media.find(mid).isEmpty()) {
                throw ValidationException.of("mediaIds[" + i + "]", "Photo introuvable.");
            }
            distinct.add(mid);
        }
        jdbc.update("DELETE FROM product_media WHERE product_id = :id", new MapSqlParameterSource("id", id));
        int pos = 0;
        for (Long mid : distinct) {
            jdbc.update("INSERT INTO product_media (product_id, media_id, position) VALUES (:p, :m, :pos)",
                    new MapSqlParameterSource().addValue("p", id).addValue("m", mid).addValue("pos", pos++));
        }
        p.touch(clock.instant());
        products.flush();
        return reader.toAdmin(p);
    }

    @Transactional
    public ProductAdmin setItems(long id, List<ItemInput> items) {
        Product p = loadForUpdate(id);
        List<ItemInput> list = items == null ? List.of() : items;
        Map<String, String> errors = new LinkedHashMap<>();
        Set<Long> seen = new HashSet<>();
        for (int i = 0; i < list.size(); i++) {
            ItemInput it = list.get(i);
            String prefix = "items[" + i + "].";
            if (it == null || it.stockItemId() == null || !stockItemExists(it.stockItemId())) {
                errors.put(prefix + "stockItemId", "Pièce introuvable.");
                continue;
            }
            if (!seen.add(it.stockItemId())) {
                errors.put(prefix + "stockItemId", "Cette pièce est déjà dans le pack.");
            }
            if (it.quantity() != null && (it.quantity() < 1 || it.quantity() > 99)) {
                errors.put(prefix + "quantity", "La quantité doit être comprise entre 1 et 99.");
            }
            Hotspot h = it.hotspot();
            if (h != null && (!inRange(h.x()) || !inRange(h.y()))) {
                errors.put(prefix + "hotspot", "Place le point sur la photo (x et y entre 0 et 100 %).");
            }
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
        jdbc.update("DELETE FROM pack_bom WHERE product_id = :id", new MapSqlParameterSource("id", id));
        int order = 1;
        for (ItemInput it : list) {
            Hotspot h = it.hotspot();
            jdbc.update("""
                    INSERT INTO pack_bom (product_id, stock_item_id, quantity, gift, hotspot_x, hotspot_y, sort_order)
                    VALUES (:p, :s, :q, :gift, :x, :y, :ord)
                    """,
                    new MapSqlParameterSource()
                            .addValue("p", id)
                            .addValue("s", it.stockItemId())
                            .addValue("q", it.quantity() == null ? 1 : it.quantity())
                            .addValue("gift", Boolean.TRUE.equals(it.gift()))
                            .addValue("x", h == null ? null : h.x().setScale(2, java.math.RoundingMode.HALF_UP),
                                    java.sql.Types.NUMERIC)
                            .addValue("y", h == null ? null : h.y().setScale(2, java.math.RoundingMode.HALF_UP),
                                    java.sql.Types.NUMERIC)
                            .addValue("ord", order++));
        }
        p.touch(clock.instant());
        products.flush();
        return reader.toAdmin(p);
    }

    // ------------------------------------------------------------------------------------------

    private record Validated(String name, String slug, String sku, String badge, String tagline, String audience,
            String description, long priceMillimes, boolean active, Savings savings) {}

    private Validated validate(ProductInput in, Product existing) {
        if (in == null) {
            throw ValidationException.of("name", "Donne un nom à ce pack.");
        }
        Map<String, String> errors = new LinkedHashMap<>();
        String name = squash(in.name());
        if (name == null || name.length() < 3 || name.length() > 80) {
            errors.put("name", "Le nom doit faire entre 3 et 80 caractères.");
        }

        String slug;
        if (in.slug() != null && !in.slug().isBlank()) {
            slug = Slugs.slugify(in.slug());
        } else if (existing != null) {
            slug = existing.getSlug(); // un renommage ne casse pas le lien public existant
        } else {
            slug = Slugs.slugify(name);
        }
        Long selfId = existing == null ? -1L : existing.getId();
        if (slug.isEmpty()) {
            errors.put("slug", "Choisis un lien pour ce pack (lettres et chiffres).");
        } else if (products.existsBySlugAndIdNot(slug, selfId)) {
            errors.put("slug", MSG_SLUG_TAKEN);
        }

        String sku;
        if (in.sku() != null && !in.sku().isBlank()) {
            sku = in.sku().trim().toUpperCase(Locale.ROOT);
            if (!sku.matches("[A-Z0-9]+(-[A-Z0-9]+)*") || sku.length() > 64) {
                errors.put("sku", "SKU invalide (lettres, chiffres et tirets, 64 caractères max).");
            } else if (products.existsBySkuAndIdNot(sku, selfId)) {
                errors.put("sku", "Ce SKU est déjà utilisé par un autre pack.");
            }
        } else if (existing != null) {
            sku = existing.getSku();
        } else {
            String base = slug.isEmpty() ? "PACK" : Slugs.skuFor(slug);
            sku = base;
            for (int n = 2; products.existsBySkuAndIdNot(sku, selfId); n++) {
                sku = base + "-" + n;
            }
        }

        String badge = squash(in.badge());
        if (badge != null && badge.length() > 40) {
            errors.put("badge", "Badge trop long (40 caractères max).");
        }
        String tagline = squash(in.tagline());
        if (tagline == null || tagline.length() < 5 || tagline.length() > 160) {
            errors.put("tagline", "La promesse doit faire entre 5 et 160 caractères.");
        }
        String audience = squash(in.audience());
        if (audience != null && audience.length() > 300) {
            errors.put("audience", "Cible trop longue (300 caractères max).");
        }
        String description = in.description() == null || in.description().isBlank() ? null
                : in.description().trim();
        if (description != null && description.length() > 4000) {
            errors.put("description", "Description trop longue (4000 caractères max).");
        }

        boolean active = Boolean.TRUE.equals(in.active());
        long price = 0;
        BigDecimal priceTnd = in.priceTnd();
        if (priceTnd == null) {
            errors.put("priceTnd", "Indique un prix (0 tant qu'il n'est pas fixé).");
        } else if (priceTnd.signum() < 0 || priceTnd.stripTrailingZeros().scale() > 3
                || priceTnd.compareTo(MAX_PRICE) > 0) {
            errors.put("priceTnd", "Prix invalide (positif, 3 décimales max).");
        } else {
            price = Money.toMillimes(priceTnd);
            if (active && price <= 0) {
                errors.put("priceTnd", MSG_PRICE_BEFORE_ACTIVE);
            }
        }

        Savings savings = in.savings();
        if (savings != null) {
            validateSavings(savings, errors);
        }
        if (!errors.isEmpty()) {
            throw new ValidationException(errors);
        }
        Savings clean = savings == null ? null : new Savings(squash(savings.title()), squash(savings.question()),
                savings.min(), savings.max(), savings.step(), savings.defaultValue(), savings.homeCostPerDay(),
                savings.daysPerMonth());
        return new Validated(name, slug, sku, badge, tagline, audience, description, price, active,
                CatalogReader.cleanSavings(clean));
    }

    private static void validateSavings(Savings s, Map<String, String> errors) {
        String title = squash(s.title());
        if (title == null || title.length() > 80) {
            errors.put("savings.title", "Donne un titre au calculateur (80 caractères max).");
        }
        String question = squash(s.question());
        if (question == null || question.length() > 160) {
            errors.put("savings.question", "Écris la question du calculateur (160 caractères max).");
        }
        if (s.min() == null || s.max() == null || s.min().signum() < 0 || s.min().compareTo(s.max()) >= 0) {
            errors.put("savings.min", "Le minimum doit être positif et inférieur au maximum.");
        }
        if (s.step() == null || s.step().signum() <= 0) {
            errors.put("savings.step", "Le pas doit être supérieur à 0.");
        }
        if (s.defaultValue() == null || s.min() == null || s.max() == null
                || s.defaultValue().compareTo(s.min()) < 0 || s.defaultValue().compareTo(s.max()) > 0) {
            errors.put("savings.defaultValue", "La valeur initiale doit être entre le minimum et le maximum.");
        }
        if (s.homeCostPerDay() == null || s.homeCostPerDay().signum() < 0) {
            errors.put("savings.homeCostPerDay", "Le coût maison doit être positif ou nul.");
        }
        if (s.daysPerMonth() == null || s.daysPerMonth() < 1 || s.daysPerMonth() > 31) {
            errors.put("savings.daysPerMonth", "Le nombre de jours doit être entre 1 et 31.");
        }
    }

    private static void apply(Product p, Validated v) {
        p.setBadge(v.badge());
        p.setTagline(v.tagline());
        p.setAudience(v.audience());
        p.setDescription(v.description());
        p.setPriceMillimes(v.priceMillimes());
        p.setActive(v.active());
        p.setSavings(v.savings());
    }

    /** Un seul pack phare : l'activer ici le retire aux autres. */
    private void applyFeatured(Product p, boolean featured) {
        if (featured == p.isFeatured()) {
            return;
        }
        if (featured) {
            for (Product other : products.findAll()) {
                if (other.isFeatured() && !other.getId().equals(p.getId())) {
                    other.setFeatured(false);
                }
            }
            products.flush();
        }
        p.setFeatured(featured);
        products.flush();
    }

    private boolean stockItemExists(long id) {
        Long n = jdbc.queryForObject("SELECT count(*) FROM stock_item WHERE id = :id",
                new MapSqlParameterSource("id", id), Long.class);
        return n != null && n > 0;
    }

    private static boolean inRange(BigDecimal v) {
        return v != null && v.signum() >= 0 && v.compareTo(HUNDRED) <= 0;
    }

    private static String squash(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return s.trim().replaceAll("\\s+", " ");
    }

    private Product load(long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Pack introuvable."));
    }

    private Product loadForUpdate(long id) {
        return products.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound("Pack introuvable."));
    }
}
