package com.shiftcart.order;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySku(String sku);

    Optional<Product> findBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    boolean existsBySkuAndIdNot(String sku, Long id);

    List<Product> findAllByOrderBySortOrderAscIdAsc();

    List<Product> findByActiveTrueOrderBySortOrderAscIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.sku = :sku")
    Optional<Product> findBySkuForUpdate(String sku);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(Long id);

    @Query("select coalesce(max(p.sortOrder), -1) from Product p")
    int maxSortOrder();
}
