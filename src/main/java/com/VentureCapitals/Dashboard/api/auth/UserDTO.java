package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private UUID id;
    private String email;
    private UserType userType;
    // Lombok names the getter isActive(), which Jackson would otherwise serialise as "active".
    @Getter(onMethod_ = @JsonProperty("isActive"))
    private boolean isActive;
    private boolean accountSetupComplete;
}
