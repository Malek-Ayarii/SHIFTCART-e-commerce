package com.shiftcart.stock;

import jakarta.persistence.LockModeType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface StockItemRepository extends JpaRepository<StockItem, Long> {

    List<StockItem> findAllByOrderBySortOrderAscIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from StockItem s order by s.sortOrder asc, s.id asc")
    List<StockItem> findAllForUpdate();

    /** Nomenclature : [stock_item_id, quantité par pack] pour un produit. */
    @Query(value = "select stock_item_id, quantity from pack_bom where product_id = :productId", nativeQuery = true)
    List<Object[]> bomFor(Long productId);
}
