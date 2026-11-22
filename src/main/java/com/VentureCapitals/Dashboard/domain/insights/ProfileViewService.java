package com.VentureCapitals.Dashboard.domain.insights;

import com.VentureCapitals.Dashboard.common.TargetType;
import com.VentureCapitals.Dashboard.domain.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

/** Counts who looked at a profile, for the Insights page. */
@Service
@Transactional
public class ProfileViewService {
    private final ProfileViewRepository repository;

    public ProfileViewService(ProfileViewRepository repository) {
        this.repository = repository;
    }

    /**
     * Notes that {@code viewer} opened a profile. The caller decides whether it counts: looking at
     * your own organisation's page is not interest from anyone.
     */
    public void record(User viewer, TargetType type, UUID targetId) {
        repository.record(UUID.randomUUID(), viewer.getId(), type.name(), targetId,
                LocalDate.now(ZoneOffset.UTC));
    }

    @Transactional(readOnly = true)
    public long countFor(TargetType type, UUID targetId) {
        return repository.countByTargetTypeAndTargetId(type, targetId);
    }
}
