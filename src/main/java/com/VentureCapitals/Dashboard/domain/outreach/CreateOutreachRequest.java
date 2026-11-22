package com.VentureCapitals.Dashboard.domain.outreach;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOutreachRequest {
    @NotNull(message = "Choose a startup to write to")
    private UUID toStartupId;

    @NotBlank(message = "Subject is required")
    @Size(max = 200, message = "Subject must be at most 200 characters")
    private String subject;

    @NotBlank(message = "Write a message")
    @Size(max = 5000, message = "Message must be at most 5000 characters")
    private String body;
}
