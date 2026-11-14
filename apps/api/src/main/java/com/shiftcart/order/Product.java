package com.shiftcart.order;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_millimes", nullable = false)
    private long priceMillimes;

    @Column(nullable = false)
    private boolean active;

    /** Packs complets déjà assemblés, prêts à expédier. */
    @Column(name = "assembled_stock", nullable = false)
    private int assembledStock;

    protected Product() {}

    public Long getId() {
        return id;
    }

    public String getSku() {
        return sku;
    }

    public String getName() {
        return name;
    }

    public long getPriceMillimes() {
        return priceMillimes;
    }

    public boolean isActive() {
        return active;
    }

    public int getAssembledStock() {
        return assembledStock;
    }

    public void setAssembledStock(int assembledStock) {
        this.assembledStock = Math.max(0, assembledStock);
    }

    /** "Le Pack Barista" → "Pack Barista", pour les phrases ("Ton Pack Barista…"). */
    public String shortName() {
        return name.replaceFirst("^(Le|La|Les|L’|L')\\s*", "");
    }
}
