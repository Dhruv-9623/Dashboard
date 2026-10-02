package com.VentureCapitals.Dashboard.domain.vc;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Teammates are invited by email; they must already have a VC account on the platform. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddMemberRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotNull(message = "Role is required")
    private VCRole role;
}
