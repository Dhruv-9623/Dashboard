package com.VentureCapitals.Dashboard.api.startup;

import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import org.springframework.stereotype.Component;

@Component
public class StartupMapper {
    public StartupDTO toDTO(Startup startup) {
        return StartupDTO.builder()
                .id(startup.getId())
                .name(startup.getName())
                .description(startup.getDescription())
                .website(startup.getWebsite())
                .logoUrl(startup.getLogoUrl())
                .sector(startup.getSector())
                .stage(startup.getStage() != null ? startup.getStage().name() : null)
                .location(startup.getLocation())
                .foundedYear(startup.getFoundedYear())
                .annualRevenue(startup.getAnnualRevenue())
                .teamSize(startup.getTeamSize())
                .pitchDeckUrl(startup.getPitchDeckUrl())
                // Derived from open funding cycles once those exist; none can be open yet.
                .isRaising(false)
                .createdAt(startup.getCreatedAt())
                .updatedAt(startup.getUpdatedAt())
                .build();
    }

    public StartupMemberDTO toDTO(StartupMember member) {
        return StartupMemberDTO.builder()
                .id(member.getId())
                .userId(member.getUser().getId())
                .userEmail(member.getUser().getEmail())
                .startupId(member.getStartup().getId())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
