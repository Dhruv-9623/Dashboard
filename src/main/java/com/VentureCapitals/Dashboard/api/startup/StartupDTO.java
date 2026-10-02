package com.VentureCapitals.Dashboard.api.startup;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartupDTO {
    private UUID id;
    private String name;
    private String description;
    private String website;
    private String logoUrl;
    private String sector;
    private String stage;
    private String location;
    private Integer foundedYear;
    private Long annualRevenue;
    private Integer teamSize;
    private String pitchDeckUrl;
    // Lombok names the getter isRaising(), which Jackson would otherwise serialise as "raising".
    @Getter(onMethod_ = @JsonProperty("isRaising"))
    private boolean isRaising;
    private Instant createdAt;
    private Instant updatedAt;
}
