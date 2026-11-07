package com.VentureCapitals.Dashboard.api.startup;

import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupMember;
import org.springframework.stereotype.Component;

@Component
public class StartupMapper {
    /**
     * For a startup whose funding status has not been looked up.
     *
     * <p>Used where the answer cannot matter — the response to creating or editing a profile,
     * which no "Raising" badge is read from. Anywhere a reader might act on it, pass the flag.
     */
    public StartupDTO toDTO(Startup startup) {
        return toDTO(startup, false);
    }

    /**
     * @param raising whether this startup has a funding round open. Supplied by the caller rather
     *                than queried here: a mapper asking per row costs one query per list item,
     *                and {@code StartupService.raisingAmong} answers for a whole page at once.
     */
    public StartupDTO toDTO(Startup startup, boolean raising) {
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
                .isRaising(raising)
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
