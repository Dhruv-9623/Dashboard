package com.VentureCapitals.Dashboard.domain.pool;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The signed-in VC's pool: companies the firm is tracking but hasn't invested in. Scoped to the
 * actor's own firm through {@link FirmAccessPolicy}; any member may add, edit and remove entries.
 */
@Slf4j
@Service
@Transactional
public class PoolEntryService {
    private final PoolEntryRepository poolEntryRepository;
    private final StartupRepository startupRepository;
    private final FirmAccessPolicy accessPolicy;

    public PoolEntryService(PoolEntryRepository poolEntryRepository, StartupRepository startupRepository,
                            FirmAccessPolicy accessPolicy) {
        this.poolEntryRepository = poolEntryRepository;
        this.startupRepository = startupRepository;
        this.accessPolicy = accessPolicy;
    }

    public PoolEntry createPoolEntry(User actor, PoolEntryRequest request) {
        VCMember membership = accessPolicy.requireAnyMembership(actor);
        UUID firmId = membership.getFirm().getId();

        PoolEntry entry = PoolEntry.builder()
                .vcFirm(membership.getFirm())
                .addedBy(membership)
                .build();

        if (request.getStartupId() != null) {
            // On-platform: identified by the startup; its name, sector and stage come from the profile.
            Startup startup = startupRepository.findById(request.getStartupId())
                    .orElseThrow(() -> new EntityNotFoundException("Startup not found: " + request.getStartupId()));
            if (poolEntryRepository.existsByVcFirmIdAndStartupId(firmId, startup.getId())) {
                throw new BusinessRuleViolationException(startup.getName() + " is already in your pool");
            }
            entry.setStartup(startup);
        } else {
            applyOffPlatformCompany(entry, request);
        }
        applyTracking(entry, request);

        PoolEntry saved = poolEntryRepository.save(entry);
        log.info("Pool entry created: firmId={}, entryId={}", firmId, saved.getId());
        return saved;
    }

    /** Updates tracking fields; off-platform entries can also correct the company details. */
    public PoolEntry updatePoolEntry(User actor, UUID poolEntryId, PoolEntryRequest request) {
        PoolEntry entry = findEntry(poolEntryId);
        accessPolicy.requireMember(actor, entry.getVcFirm().getId());

        if (entry.getStartup() == null) {
            applyOffPlatformCompany(entry, request);
        }
        applyTracking(entry, request);

        log.info("Pool entry updated: entryId={}", poolEntryId);
        return poolEntryRepository.save(entry);
    }

    public void deletePoolEntry(User actor, UUID poolEntryId) {
        PoolEntry entry = findEntry(poolEntryId);
        accessPolicy.requireMember(actor, entry.getVcFirm().getId());
        poolEntryRepository.delete(entry);
        log.info("Pool entry deleted: entryId={}", poolEntryId);
    }

    @Transactional(readOnly = true)
    public Page<PoolEntry> listPoolEntries(User actor, InterestLevel interestLevel, Pageable pageable) {
        UUID firmId = accessPolicy.requireAnyMembership(actor).getFirm().getId();
        return interestLevel == null
                ? poolEntryRepository.findByVcFirmId(firmId, pageable)
                : poolEntryRepository.findByVcFirmIdAndInterestLevel(firmId, interestLevel, pageable);
    }

    private void applyOffPlatformCompany(PoolEntry entry, PoolEntryRequest request) {
        String name = request.getCompanyName() == null ? "" : request.getCompanyName().trim();
        if (name.isEmpty()) {
            throw new ValidationException("Enter the company name or pick a startup on the platform");
        }
        entry.setCompanyName(name);
        entry.setCompanySector(blankToNull(request.getSector()));
        entry.setCompanyStage(blankToNull(request.getStage()));
    }

    private void applyTracking(PoolEntry entry, PoolEntryRequest request) {
        List<String> tags = new ArrayList<>();
        if (request.getTags() != null) {
            request.getTags().stream()
                    .map(String::trim)
                    .filter(tag -> !tag.isEmpty())
                    .distinct()
                    .forEach(tags::add);
        }
        entry.setTags(tags);
        entry.setNotes(blankToNull(request.getNotes()));
        entry.setInterestLevel(request.getInterestLevel());
    }

    private PoolEntry findEntry(UUID poolEntryId) {
        return poolEntryRepository.findWithDetailsById(poolEntryId)
                .orElseThrow(() -> new EntityNotFoundException("Pool entry not found: " + poolEntryId));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
