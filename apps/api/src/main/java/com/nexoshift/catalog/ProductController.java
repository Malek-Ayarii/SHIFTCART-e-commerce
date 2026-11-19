package com.nexoshift.catalog;

import com.nexoshift.catalog.CatalogDtos.ProductPublic;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.order.ProductRepository;
import java.time.Duration;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Catalogue public : packs actifs uniquement (un brouillon ou un lien inconnu → 404). */
@RestController
@RequestMapping("/api/products")
public class ProductController {

    /** Court cache partagé : la boutique revalide de toute façon toutes les 60 s. */
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic();

    private final ProductRepository products;
    private final CatalogReader reader;

    public ProductController(ProductRepository products, CatalogReader reader) {
        this.products = products;
        this.reader = reader;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductPublic>> list() {
        return ResponseEntity.ok().cacheControl(CACHE)
                .body(reader.toPublic(products.findByActiveTrueOrderBySortOrderAscIdAsc()));
    }

    @GetMapping("/{slug}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductPublic> get(@PathVariable String slug) {
        ProductPublic p = products.findBySlug(slug == null ? "" : slug.trim().toLowerCase(java.util.Locale.ROOT))
                .filter(com.nexoshift.order.Product::isActive)
                .map(reader::toPublic)
                .orElseThrow(() -> ApiException.notFound("Ce pack n'existe pas ou n'est plus disponible."));
        return ResponseEntity.ok().cacheControl(CACHE).body(p);
    }
}
