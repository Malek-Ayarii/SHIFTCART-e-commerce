package com.nexoshift.messages;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByOrderIdOrderByCreatedAtAscIdAsc(Long orderId);

    Optional<Message> findFirstByPhoneE164AndDirectionOrderByCreatedAtDesc(String phoneE164, String direction);

    Optional<Message> findFirstByProviderMessageId(String providerMessageId);

    boolean existsByProviderMessageIdAndDirection(String providerMessageId, String direction);
}
