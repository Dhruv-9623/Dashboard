package com.VentureCapitals.Dashboard.domain.suggestion;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * "You should talk to this one", with the reason. One row per person and target (V13): regenerating
 * refreshes a suggestion rather than adding a copy, and one that was dismissed stays dismissed.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "ai_suggestions")
public class AISuggestion extends BaseEntity {
    @Column(name = "for_user_id", nullable = false)
    private UUID forUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "suggestion_type", nullable = false, length = 20)
    private SuggestionType suggestionType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    // BigDecimal to match the NUMERIC(4,3) column; schema validation rejects a double.
    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal score;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reasoning;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SuggestionStatus status;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;
}
