package com.VentureCapitals.Dashboard.domain.investment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, UUID> {
    // The API shows startup name/sector/logo per row: fetch the startup in the same query (no N+1).
    // vcFirm isn't fetched — only its id is read, which Hibernate serves from the proxy.
    @EntityGraph(attributePaths = {"startup"}, type = EntityGraph.EntityGraphType.LOAD)
    Page<Investment> findByVcFirmId(UUID vcFirmId, Pageable pageable);

    @EntityGraph(attributePaths = {"startup"}, type = EntityGraph.EntityGraphType.LOAD)
    Page<Investment> findByVcFirmIdAndStatus(UUID vcFirmId, InvestmentStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"startup"}, type = EntityGraph.EntityGraphType.LOAD)
    Optional<Investment> findWithStartupById(UUID id);

    @Query("select i.currency as currency, sum(i.amount) as total from Investment i "
            + "where i.vcFirm.id = :firmId group by i.currency order by i.currency")
    List<CurrencyTotal> sumAmountByCurrency(@Param("firmId") UUID firmId);

    @Query("select i.status as status, count(i) as count from Investment i "
            + "where i.vcFirm.id = :firmId group by i.status")
    List<StatusCount> countByStatus(@Param("firmId") UUID firmId);

    interface CurrencyTotal {
        String getCurrency();

        Long getTotal();
    }

    interface StatusCount {
        InvestmentStatus getStatus();

        Long getCount();
    }
}
