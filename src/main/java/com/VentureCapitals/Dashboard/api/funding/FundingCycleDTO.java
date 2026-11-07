package com.VentureCapitals.Dashboard.api.funding;

import com.VentureCapitals.Dashboard.domain.funding.FundingCycleStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FundingCycleDTO {
    private UUID id;
    private UUID startupId;
    private String startupName;
    private String startupSector;
    private String startupStage;

    private String roundType;
    private Long targetAmount;
    private String currency;
    private Long minTicketSize;
    private Long maxTicketSize;
    private FundingCycleStatus status;
    private String pitchDeckUrl;
    private String dataRoomUrl;
    private Instant openedAt;
    private Instant closedAt;

    /**
     * Money pledged, split by how firm it is.
     *
     * <p>Three numbers rather than one: adding an indication to a signed commitment produces a
     * headline that overstates the round, and the person it misleads most is the founder planning
     * against it. `committedAmount` is the hard number; the UI shows the bands stacked.
     */
    private Long committedAmount;
    private Long softCommittedAmount;
    private Long indicatedAmount;
    private int commitmentCount;
}
