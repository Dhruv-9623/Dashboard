package com.VentureCapitals.Dashboard.domain.messaging;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    @NotBlank(message = "Write a message first")
    @Size(max = 5000, message = "A message can be at most 5000 characters")
    private String body;
}
