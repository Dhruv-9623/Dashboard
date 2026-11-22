package com.VentureCapitals.Dashboard.domain.signals;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface SignalRepository extends JpaRepository<Signal, UUID> {

    /**
     * What is relevant to one person: signals about companies they hold, track or have saved,
     * about their own organisation, and the unattached market ones. Newest first.
     *
     * <p>The id collections must not be empty — the service passes a sentinel — because an empty
     * {@code IN ()} is a syntax error on some dialects and "match nothing" on others.
     */
    @Query("""
            select s from Signal s
              left join fetch s.relatedStartup rs
              left join fetch s.relatedVcFirm rf
             where (:type is null or s.signalType = :type)
               and (rs.id in :startupIds or rf.id in :firmIds or (rs is null and rf is null))
             order by s.publishedAt desc
            """)
    List<Signal> findRelevant(@Param("type") SignalType type,
                              @Param("startupIds") Collection<UUID> startupIds,
                              @Param("firmIds") Collection<UUID> firmIds,
                              Pageable pageable);

    /** News about particular companies since a date — the raw material for a digest. */
    @Query("""
            select s from Signal s join fetch s.relatedStartup rs
             where rs.id in :startupIds and s.publishedAt >= :since
             order by s.publishedAt desc
            """)
    List<Signal> findAboutStartupsSince(@Param("startupIds") Collection<UUID> startupIds,
                                        @Param("since") Instant since);
}
