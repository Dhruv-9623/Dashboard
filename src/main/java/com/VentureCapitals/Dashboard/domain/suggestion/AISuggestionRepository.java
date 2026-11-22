package com.VentureCapitals.Dashboard.domain.suggestion;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AISuggestionRepository extends JpaRepository<AISuggestion, UUID> {
    List<AISuggestion> findByForUserId(UUID forUserId);

    Optional<AISuggestion> findByIdAndForUserId(UUID id, UUID forUserId);
}
