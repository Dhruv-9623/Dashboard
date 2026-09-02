package com.VentureCapitals.Dashboard.api.auth;

import com.VentureCapitals.Dashboard.domain.user.UserType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountTypeSelectionRequest {
    @NotNull(message = "Account type is required")
    private UserType userType;
}
