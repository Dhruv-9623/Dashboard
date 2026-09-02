package com.VentureCapitals.Dashboard.domain.user;

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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String email;

    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type")
    private UserType userType;

    private String oauthProvider;

    private String oauthId;

    @Column(nullable = false)
    private boolean isActive = true;
}