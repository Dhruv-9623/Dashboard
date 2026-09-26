package com.VentureCapitals.Dashboard.api.investment;

import com.VentureCapitals.Dashboard.domain.investment.Investment;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import org.springframework.stereotype.Component;

@Component
public class InvestmentMapper {
    public InvestmentDTO toDTO(Investment investment) {
        Startup startup = investment.getStartup();
        return InvestmentDTO.builder()
                .id(investment.getId())
                .vcFirmId(investment.getVcFirm().getId())
                .startupId(startup.getId())
                .startupName(startup.getName())
                .startupSector(startup.getSector())
                .startupLogoUrl(startup.getLogoUrl())
                .investmentDate(investment.getInvestmentDate())
                .amount(investment.getAmount())
                .currency(investment.getCurrency())
                .round(investment.getRound())
                .equityPercentage(investment.getEquityPercentage())
                .status(investment.getStatus())
                .notes(investment.getNotes())
                .createdAt(investment.getCreatedAt())
                .updatedAt(investment.getUpdatedAt())
                .build();
    }
}
