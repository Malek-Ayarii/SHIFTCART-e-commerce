package com.shiftcart.order;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<CustomerOrder, Long>, JpaSpecificationExecutor<CustomerOrder> {

    Optional<CustomerOrder> findByRef(String ref);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CustomerOrder o where o.id = :id")
    Optional<CustomerOrder> findByIdForUpdate(Long id);

    @Query(value = "select nextval('order_ref_seq')", nativeQuery = true)
    long nextRefNumber();

    /**
     * Verrou consultatif Postgres limité à la transaction : sérialise les créations pour un même téléphone,
     * pour que deux envois simultanés (double clic) ne passent pas tous les deux l'anti-doublon.
     */
    @Query(value = "select 1 from (select pg_advisory_xact_lock(hashtext(:key))) l", nativeQuery = true)
    Integer lockForCreation(String key);

    /** Anti-doublon : même téléphone + même produit depuis {@code since}, hors annulées. */
    @Query("""
            select o from CustomerOrder o
            where o.phoneE164 = :phone and o.product.id = :productId and o.createdAt >= :since
              and o.status <> com.shiftcart.order.OrderStatus.CANCELLED
            order by o.createdAt desc
            """)
    List<CustomerOrder> findRecentDuplicates(String phone, Long productId, Instant since, Limit limit);

    /** Commandes d'un téléphone dans des statuts donnés, plus récentes d'abord. */
    List<CustomerOrder> findByPhoneE164AndStatusInOrderByCreatedAtDesc(String phone, Collection<OrderStatus> statuses);

    List<CustomerOrder> findByStatusAndCreatedAtBefore(OrderStatus status, Instant before);

    @Query("""
            select o.status as status, count(o) as total from CustomerOrder o
            where o.createdAt >= :start and o.createdAt < :end
            group by o.status
            """)
    List<StatusCount> countByStatus(Instant start, Instant end);

    interface StatusCount {
        OrderStatus getStatus();

        long getTotal();
    }
}
