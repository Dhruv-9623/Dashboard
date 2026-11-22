package com.VentureCapitals.Dashboard.api.vc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThesisDTO {
    private List<String> sectors;
    private List<String> stages;
    private Long chequeSizeMin;
    private Long chequeSizeMax;
    private String currency;
    private String notes;
    private Instant updatedAt;
}
