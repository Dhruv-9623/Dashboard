package com.VentureCapitals.Dashboard.api.vc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VCFirmDTO {
    private UUID id;
    private String name;
    private String description;
    private String website;
    private Long aum;
    private String investmentStage;
    private List<String> sectors;
    private String location;
    private Integer foundedYear;
    private Instant createdAt;
    private Instant updatedAt;
}
