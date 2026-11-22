package com.VentureCapitals.Dashboard.api.messaging;

import com.VentureCapitals.Dashboard.common.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CounterpartyDTO {
    private UUID userId;
    private String email;
    private String displayName;
    private TargetType entityType;
    private UUID entityId;
    private String entityName;
    private String logoUrl;
}
