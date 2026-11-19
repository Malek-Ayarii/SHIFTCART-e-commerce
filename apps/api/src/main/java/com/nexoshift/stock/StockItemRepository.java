package com.nexoshift.stock;

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

    @Query("select coalesce(max(s.sortOrder), 0) from StockItem s")
    int maxSortOrder();

    /** Nomenclature complète : [product_id, stock_item_id, quantité par pack]. */
    @Query(value = "select product_id, stock_item_id, quantity from pack_bom", nativeQuery = true)
    List<Object[]> allBom();

    /** Nomenclature : [stock_item_id, quantité par pack] pour un produit. */
    @Query(value = "select stock_item_id, quantity from pack_bom where product_id = :productId", nativeQuery = true)
    List<Object[]> bomFor(Long productId);

    @Query(value = "select count(*) from pack_bom where stock_item_id = :itemId", nativeQuery = true)
    long usageCount(Long itemId);
}
