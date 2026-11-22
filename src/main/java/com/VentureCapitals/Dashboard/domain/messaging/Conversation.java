package com.VentureCapitals.Dashboard.domain.messaging;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * A chat between exactly two people, opened by an accepted {@link ConnectionRequest}.
 *
 * <p>Its participants are the request's two users and it has no other source of identity, which is
 * what makes Business Rule 1 structural: there is no way to construct a conversation that did not
 * start with a request, and the unique foreign key in V13 allows only one per request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity {
    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "connection_request_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_conversation_request"))
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ConnectionRequest connectionRequest;
}
