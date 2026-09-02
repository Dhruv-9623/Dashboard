package com.VentureCapitals.Dashboard.api.vc;

import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import org.springframework.stereotype.Component;

@Component
public class VCFirmMapper {
    public VCFirmDTO toDTO(VCFirm firm) {
        return VCFirmDTO.builder()
                .id(firm.getId())
                .name(firm.getName())
                .description(firm.getDescription())
                .website(firm.getWebsite())
                .aum(firm.getAum())
                .investmentStage(firm.getInvestmentStage())
                .sectors(firm.getSectors())
                .location(firm.getLocation())
                .foundedYear(firm.getFoundedYear())
                .createdAt(firm.getCreatedAt())
                .updatedAt(firm.getUpdatedAt())
                .build();
    }

    public VCMemberDTO toDTO(VCMember member) {
        return VCMemberDTO.builder()
                .id(member.getId())
                .userId(member.getUser().getId())
                .userEmail(member.getUser().getEmail())
                .firmId(member.getFirm().getId())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .createdAt(member.getCreatedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
