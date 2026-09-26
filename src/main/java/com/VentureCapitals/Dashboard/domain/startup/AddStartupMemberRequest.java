package com.VentureCapitals.Dashboard.domain.startup;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Co-founders are invited by email and must already have a STARTUP account. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddStartupMemberRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotNull(message = "Role is required")
    private StartupRole role;
}
