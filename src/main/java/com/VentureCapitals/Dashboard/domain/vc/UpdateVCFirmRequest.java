package com.VentureCapitals.Dashboard.domain.vc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateVCFirmRequest {
    private String name;
    private String description;
    private String website;
    private Long aum;
    private String investmentStage;
    private List<String> sectors;
    private String location;
    private Integer foundedYear;
}
