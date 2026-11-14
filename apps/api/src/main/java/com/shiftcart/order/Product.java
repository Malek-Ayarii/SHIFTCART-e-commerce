package com.shiftcart.order;

import com.shiftcart.catalog.Savings;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Un pack vendu par la boutique (catalogue v2 : docs/CONTRACT.md › v2). */
@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    private String badge;

    @Column(nullable = false)
    private String tagline;

    private String audience;

    private String description;

    @Column(name = "price_millimes", nullable = false)
    private long priceMillimes;

    @Column(nullable = false)
    private boolean active;

    @Column(nullable = false)
    private boolean featured;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Calculateur d'économies, {@code null} = désactivé. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Savings savings;

    @Column(name = "cover_media_id")
    private Long coverMediaId;

    @Column(name = "photo_seeded", nullable = false)
    private boolean photoSeeded;

    /** Packs complets déjà assemblés, prêts à expédier. */
    @Column(name = "assembled_stock", nullable = false)
    private int assembledStock;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Product() {}

    public Product(String sku, String slug, String name, Instant now) {
        this.sku = sku;
        this.slug = slug;
        this.name = name;
        this.tagline = "";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBadge() {
        return badge;
    }

    public void setBadge(String badge) {
        this.badge = badge;
    }

    public String getTagline() {
        return tagline;
    }

    public void setTagline(String tagline) {
        this.tagline = tagline;
    }

    public String getAudience() {
        return audience;
    }

    public void setAudience(String audience) {
        this.audience = audience;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public long getPriceMillimes() {
        return priceMillimes;
    }

    public void setPriceMillimes(long priceMillimes) {
        this.priceMillimes = priceMillimes;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isFeatured() {
        return featured;
    }

    public void setFeatured(boolean featured) {
        this.featured = featured;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Savings getSavings() {
        return savings;
    }

    public void setSavings(Savings savings) {
        this.savings = savings;
    }

    public Long getCoverMediaId() {
        return coverMediaId;
    }

    public void setCoverMediaId(Long coverMediaId) {
        this.coverMediaId = coverMediaId;
    }

    public boolean isPhotoSeeded() {
        return photoSeeded;
    }

    public void setPhotoSeeded(boolean photoSeeded) {
        this.photoSeeded = photoSeeded;
    }

    public int getAssembledStock() {
        return assembledStock;
    }

    public void setAssembledStock(int assembledStock) {
        this.assembledStock = Math.max(0, assembledStock);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touch(Instant now) {
        this.updatedAt = now;
    }

    /** "Le Pack Barista" → "Pack Barista", pour les phrases ("Ton Pack Barista…"). */
    public String shortName() {
        return name.replaceFirst("^(Le|La|Les|L’|L')\\s*", "");
    }
}
