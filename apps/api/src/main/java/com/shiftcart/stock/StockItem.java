package com.shiftcart.stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Pièce du stock (produit d'un ou plusieurs packs : Moka, thermos, lunchbox…). */
@Entity
@Table(name = "stock_item")
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(name = "photo_media_id")
    private Long photoMediaId;

    @Column(name = "unit_cost_millimes", nullable = false)
    private long unitCostMillimes;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private int threshold;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected StockItem() {}

    public StockItem(String name, int sortOrder) {
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getPhotoMediaId() {
        return photoMediaId;
    }

    public void setPhotoMediaId(Long photoMediaId) {
        this.photoMediaId = photoMediaId;
    }

    public long getUnitCostMillimes() {
        return unitCostMillimes;
    }

    public void setUnitCostMillimes(long unitCostMillimes) {
        this.unitCostMillimes = unitCostMillimes;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getThreshold() {
        return threshold;
    }

    public void setThreshold(int threshold) {
        this.threshold = threshold;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
