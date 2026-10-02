package com.VentureCapitals.Dashboard.domain.startup;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StartupRepository extends JpaRepository<Startup, UUID>, JpaSpecificationExecutor<Startup> {
    List<Startup> findByNameContainingIgnoreCase(String name);

    /** Discovery filters; each is skipped when null or blank. */
    static Specification<Startup> matching(String search, String sector, StartupStage stage) {
        Specification<Startup> spec = (root, query, cb) -> cb.conjunction();
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), pattern));
        }
        if (sector != null && !sector.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("sector"), sector));
        }
        if (stage != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("stage"), stage));
        }
        return spec;
    }
}
