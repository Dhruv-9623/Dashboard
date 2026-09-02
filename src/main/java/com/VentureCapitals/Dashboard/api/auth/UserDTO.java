package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.domain.user.UserType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
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
    private boolean isActive;
    private boolean accountSetupComplete;
}
