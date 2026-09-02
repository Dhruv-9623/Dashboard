package com.VentureCapitals.Dashboard.domain.vc;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateVCFirmRequest {
    @NotBlank(message = "Firm name is required")
    private String name;

    private String description;

    private String website;

    private Long aum;

    private String investmentStage;

    private List<String> sectors;

    private String location;

    private Integer foundedYear;
}
