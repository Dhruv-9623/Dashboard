package com.VentureCapitals.Dashboard.domain.pool;

import com.VentureCapitals.Dashboard.common.exception.EntityNotFoundException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCFirmRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@Transactional
public class PoolEntryService {
    private final PoolEntryRepository poolEntryRepository;
    private final VCFirmRepository vcFirmRepository;
    private final VCMemberRepository vcMemberRepository;
    private final StartupRepository startupRepository;

    public PoolEntryService(PoolEntryRepository poolEntryRepository, VCFirmRepository vcFirmRepository,
                            VCMemberRepository vcMemberRepository, StartupRepository startupRepository) {
        this.poolEntryRepository = poolEntryRepository;
        this.vcFirmRepository = vcFirmRepository;
        this.vcMemberRepository = vcMemberRepository;
        this.startupRepository = startupRepository;
    }

    public PoolEntry createPoolEntry(UUID vcFirmId, User actor, CreatePoolEntryRequest request) {
        VCFirm firm = vcFirmRepository.findById(vcFirmId)
                .orElseThrow(() -> new EntityNotFoundException("VC Firm not found: " + vcFirmId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(vcFirmId)) {
            throw new UnauthorizedException("User does not belong to this firm");
        }

        validateXorConstraint(request.getStartupId(), request.getCompanyName());

        Startup startup = null;
        if (request.getStartupId() != null) {
            startup = startupRepository.findById(request.getStartupId())
                    .orElseThrow(() -> new EntityNotFoundException("Startup not found: " + request.getStartupId()));
        }

        PoolEntry entry = PoolEntry.builder()
                .vcFirm(firm)
                .startup(startup)
                .companyName(request.getCompanyName())
                .addedBy(actorMembership)
                .tags(request.getTags())
                .notes(request.getNotes())
                .interestLevel(request.getInterestLevel())
                .build();

        PoolEntry saved = poolEntryRepository.save(entry);
        log.info("Pool entry created: firmId={}, entryId={}", vcFirmId, saved.getId());

        return saved;
    }

    public PoolEntry updatePoolEntry(UUID poolEntryId, User actor, UpdatePoolEntryRequest request) {
        PoolEntry entry = poolEntryRepository.findById(poolEntryId)
                .orElseThrow(() -> new EntityNotFoundException("Pool entry not found: " + poolEntryId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(entry.getVcFirm().getId())) {
            throw new UnauthorizedException("User does not have access to this pool entry");
        }

        entry.setTags(request.getTags());
        entry.setNotes(request.getNotes());
        entry.setInterestLevel(request.getInterestLevel());

        PoolEntry updated = poolEntryRepository.save(entry);
        log.info("Pool entry updated: entryId={}", poolEntryId);

        return updated;
    }

    public void deletePoolEntry(UUID poolEntryId, User actor) {
        PoolEntry entry = poolEntryRepository.findById(poolEntryId)
                .orElseThrow(() -> new EntityNotFoundException("Pool entry not found: " + poolEntryId));

        VCMember actorMembership = vcMemberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new UnauthorizedException("User is not a member of any firm"));

        if (!actorMembership.getFirm().getId().equals(entry.getVcFirm().getId())) {
            throw new UnauthorizedException("User does not have access to this pool entry");
        }

        poolEntryRepository.deleteById(poolEntryId);
        log.info("Pool entry deleted: entryId={}", poolEntryId);
    }

    @Transactional(readOnly = true)
    public PoolEntry getPoolEntry(UUID poolEntryId) {
        return poolEntryRepository.findById(poolEntryId)
                .orElseThrow(() -> new EntityNotFoundException("Pool entry not found: " + poolEntryId));
    }

    @Transactional(readOnly = true)
    public Page<PoolEntry> listPoolEntriesByFirm(UUID vcFirmId, Pageable pageable) {
        return poolEntryRepository.findByVcFirmId(vcFirmId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<PoolEntry> listPoolEntriesByFirmAndInterestLevel(UUID vcFirmId, InterestLevel interestLevel, Pageable pageable) {
        return poolEntryRepository.findByVcFirmIdAndInterestLevel(vcFirmId, interestLevel, pageable);
    }

    private void validateXorConstraint(UUID startupId, String companyName) {
        boolean hasStartupId = startupId != null;
        boolean hasCompanyName = companyName != null && !companyName.isBlank();

        if (hasStartupId && hasCompanyName) {
            throw new ValidationException("Cannot set both startup ID and company name");
        }

        if (!hasStartupId && !hasCompanyName) {
            throw new ValidationException("Must set either startup ID or company name");
        }
    }
}
