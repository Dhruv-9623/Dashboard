package com.VentureCapitals.Dashboard.api.pool;

import com.VentureCapitals.Dashboard.domain.pool.PoolEntry;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PoolEntryMapper {
    public PoolEntryDTO toDTO(PoolEntry entry) {
        Startup startup = entry.getStartup();
        boolean onPlatform = startup != null;
        return PoolEntryDTO.builder()
                .id(entry.getId())
                .vcFirmId(entry.getVcFirm().getId())
                .startupId(onPlatform ? startup.getId() : null)
                // On-platform entries always show the startup's current name, sector and stage.
                .companyName(onPlatform ? startup.getName() : entry.getCompanyName())
                .sector(onPlatform ? startup.getSector() : entry.getCompanySector())
                .stage(onPlatform ? (startup.getStage() != null ? startup.getStage().name() : null) : entry.getCompanyStage())
                .addedByEmail(entry.getAddedBy() != null ? entry.getAddedBy().getUser().getEmail() : null)
                .tags(entry.getTags() != null ? List.copyOf(entry.getTags()) : List.of())
                .notes(entry.getNotes())
                .interestLevel(entry.getInterestLevel())
                .addedAt(entry.getCreatedAt())
                .build();
    }
}
