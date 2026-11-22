package com.VentureCapitals.Dashboard.api.vc;

import com.VentureCapitals.Dashboard.domain.vc.FirmProfile;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmThesis;
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

    /** The firm as the reader may see it: the public profile, plus thesis and plan for members. */
    public VCFirmDTO toDTO(FirmProfile profile) {
        VCFirmDTO dto = toDTO(profile.firm());
        if (profile.own()) {
            dto.setPlanTier(profile.firm().getPlanTier());
            dto.setThesis(toDTO(profile.thesis()));
        }
        return dto;
    }

    public ThesisDTO toDTO(VCFirmThesis thesis) {
        if (thesis == null) return null;
        return ThesisDTO.builder()
                .sectors(thesis.getSectors())
                .stages(thesis.getStages())
                .chequeSizeMin(thesis.getChequeSizeMin())
                .chequeSizeMax(thesis.getChequeSizeMax())
                .currency(thesis.getCurrency())
                .notes(thesis.getNotes())
                .updatedAt(thesis.getUpdatedAt())
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
