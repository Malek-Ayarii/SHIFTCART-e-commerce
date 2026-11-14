package com.shiftcart.stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Pièce détachée d'un pack (Moka, Thermos LED, café 250 g, emballage). */
@Entity
@Table(name = "stock_item")
public class StockItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "unit_cost_millimes", nullable = false)
    private long unitCostMillimes;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private int threshold;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected StockItem() {}

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
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
