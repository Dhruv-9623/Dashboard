package com.VentureCapitals.Dashboard.domain.vc;

import com.VentureCapitals.Dashboard.common.BaseEntity;
import com.VentureCapitals.Dashboard.domain.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "vc_firm_members", uniqueConstraints = {
        @UniqueConstraint(columnNames = "user_id", name = "uq_user_id_vc_member")
})
public class VCMember extends BaseEntity {
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_vc_member_user"))
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "firm_id", nullable = false, foreignKey = @ForeignKey(name = "fk_vc_member_firm"))
    private VCFirm firm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VCRole role;

    @Column(nullable = false)
    private Instant joinedAt;
}
