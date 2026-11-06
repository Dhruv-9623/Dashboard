export enum FundingCycleStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PAUSED = 'PAUSED',
}

export enum CommitmentStatus {
  INDICATED = 'INDICATED',
  SOFT_COMMITTED = 'SOFT_COMMITTED',
  COMMITTED = 'COMMITTED',
  /**
   * The firm pulled out. Not a step on the ladder — it sits outside the scale, and the API
   * excludes it from every band total, so a withdrawn pledge never inflates a round.
   */
  WITHDRAWN = 'WITHDRAWN',
}

export interface FundingCommitmentDTO {
  id: string
  fundingCycleId: string
  vcFirmId: string
  /** Null on the firm's own book — you already know whose it is. */
  vcFirmName: string | null
  amount: number
  currency: string
  status: CommitmentStatus
  committedAt: string

  /**
   * Which round this pledge was made to. Only sent on `/api/commitments` (the firm's own book),
   * where a row has to name the company; null on a round's investor list, where the round is
   * already the thing on screen.
   */
  startupId: string | null
  startupName: string | null
  roundType: string | null
  cycleStatus: FundingCycleStatus | null
  cycleTargetAmount: number | null
  /** When the round shut, if it has. Prefills the investment date on the convert form. */
  cycleClosedAt: string | null

  /**
   * The portfolio record this pledge became, or null if it hasn't been recorded yet.
   *
   * Not a status: a converted pledge is still COMMITTED and still counts toward the round. This
   * is how the UI tells money promised from money actually paid.
   */
  convertedInvestmentId: string | null
}

/**
 * One move in a round's history, from `GET /api/funding-cycles/{id}/history`.
 *
 * Both sides of the change rather than a label for it, which is what lets the momentum chart
 * recompute the running band totals at any point in time. A null `fromStatus` means the pledge
 * was made here.
 */
export interface CommitmentEventDTO {
  id: string
  commitmentId: string
  vcFirmId: string
  vcFirmName: string | null
  fromStatus: CommitmentStatus | null
  toStatus: CommitmentStatus
  fromAmount: number | null
  toAmount: number
  currency: string
  occurredAt: string
}

export interface FundingCycleDTO {
  id: string
  startupId: string
  startupName: string
  startupSector: string
  startupStage: string
  roundType: string
  targetAmount: number
  currency: string
  minTicketSize: number | null
  maxTicketSize: number | null
  status: FundingCycleStatus
  pitchDeckUrl: string | null
  dataRoomUrl: string | null
  openedAt: string
  closedAt: string | null
  /**
   * Pledged money, split by how firm it is.
   *
   * Three numbers rather than one: adding an indication to a signed commitment produces a
   * headline that overstates the round, and the person most misled by it is the founder planning
   * against it. `committedAmount` is the hard number.
   */
  committedAmount: number
  softCommittedAmount: number
  indicatedAmount: number
  commitmentCount: number
}

/** Committed plus soft — what a founder could reasonably forecast. Indications don't count. */
export const likelyAmount = (cycle: FundingCycleDTO) =>
  cycle.committedAmount + cycle.softCommittedAmount

/** Everything pledged at any level, which is what the progress ladder adds up to. */
export const pledgedAmount = (cycle: FundingCycleDTO) =>
  cycle.committedAmount + cycle.softCommittedAmount + cycle.indicatedAmount

export interface UpsertFundingCycleRequest {
  roundType: string
  targetAmount: number
  currency: string
  minTicketSize?: number
  maxTicketSize?: number
  status: FundingCycleStatus
  pitchDeckUrl?: string
  dataRoomUrl?: string
}

export interface CreateCommitmentRequest {
  amount: number
  currency: string
  status: CommitmentStatus
}

/**
 * Recording a pledge as an investment. Everything is optional, and everything absent is taken
 * from the pledge or the round — amount, currency and round type aren't accepted at all, so a
 * conversion can never disagree with what was pledged.
 */
export interface ConvertCommitmentRequest {
  equityPercentage?: number
  investmentDate?: string
  notes?: string
}

export const cycleStatusLabels: Record<FundingCycleStatus, string> = {
  [FundingCycleStatus.OPEN]: 'Open',
  [FundingCycleStatus.CLOSED]: 'Closed',
  [FundingCycleStatus.PAUSED]: 'Paused',
}

export const cycleStatusVariants: Record<
  FundingCycleStatus,
  'success' | 'secondary' | 'warning'
> = {
  [FundingCycleStatus.OPEN]: 'success',
  [FundingCycleStatus.CLOSED]: 'secondary',
  [FundingCycleStatus.PAUSED]: 'warning',
}

export const commitmentStatusLabels: Record<CommitmentStatus, string> = {
  [CommitmentStatus.INDICATED]: 'Indicated',
  [CommitmentStatus.SOFT_COMMITTED]: 'Soft committed',
  [CommitmentStatus.COMMITTED]: 'Committed',
  [CommitmentStatus.WITHDRAWN]: 'Withdrawn',
}

export const commitmentStatusVariants: Record<
  CommitmentStatus,
  'secondary' | 'warning' | 'success' | 'danger'
> = {
  [CommitmentStatus.INDICATED]: 'secondary',
  [CommitmentStatus.SOFT_COMMITTED]: 'warning',
  [CommitmentStatus.COMMITTED]: 'success',
  [CommitmentStatus.WITHDRAWN]: 'danger',
}

/** The three bands that count toward a round, in ladder order. Excludes WITHDRAWN. */
export const LADDER_STATUSES = [
  CommitmentStatus.INDICATED,
  CommitmentStatus.SOFT_COMMITTED,
  CommitmentStatus.COMMITTED,
] as const

/**
 * Already written into the firm's portfolio.
 *
 * `!= null` rather than `!== null`, so a row that simply lacks the field reads as not-converted.
 * The strict form treated `undefined` as a conversion, which silently removed a pledge from every
 * total the moment anything handed over an object without that key.
 */
export const isConverted = (commitment: FundingCommitmentDTO) =>
  commitment.convertedInvestmentId != null

/**
 * Whether this pledge is waiting to be recorded as an investment.
 *
 * Three conditions, each mirroring a server-side rule, so the action only appears where it would
 * actually succeed: the round has closed, the pledge reached COMMITTED (an indication was never
 * money), and it hasn't been converted already.
 *
 * Only meaningful on the firm's own book — `cycleStatus` is null on a round's investor list,
 * where this correctly returns false.
 */
export const isConvertible = (commitment: FundingCommitmentDTO) =>
  commitment.cycleStatus === FundingCycleStatus.CLOSED &&
  commitment.status === CommitmentStatus.COMMITTED &&
  !isConverted(commitment)

/**
 * Money this firm has promised and not yet deployed — the live part of its book.
 *
 * Excludes a converted pledge as well as a withdrawn one. A pledge that has been recorded as an
 * investment is deployed capital and belongs to the portfolio page's totals; counting it here too
 * reported the same cheque twice across two screens.
 */
export const isLive = (commitment: FundingCommitmentDTO) =>
  commitment.status !== CommitmentStatus.WITHDRAWN && !isConverted(commitment)

/**
 * The firm's book as totals, from `GET /api/commitments/summary`.
 *
 * Server-computed across every pledge, not over a page of rows — the figures have to mean the same
 * thing whichever page or band filter is selected.
 */
export interface BookSummaryDTO {
  committedByCurrency: Record<string, number>
  likelyByCurrency: Record<string, number>
  liveCount: number
  readyToRecordCount: number
}

export interface BookTotals {
  /** Signed money, per currency. The figure a fund can report as allocated. */
  committed: Record<string, number>
  /** Committed plus soft, per currency. Indications deliberately excluded. */
  likely: Record<string, number>
  /** Pledges still standing — withdrawals and already-recorded cheques both excluded. */
  liveCount: number
  /** Committed pledges on closed rounds, not yet written into the portfolio. */
  readyToRecordCount: number
}

/**
 * What a firm's own book adds up to.
 *
 * Per-currency rather than one number: a fund that has pledged in both INR and USD has two
 * exposures, and summing them would invent a third that doesn't exist.
 *
 * Withdrawals are excluded from both figures, mirroring what the API does to a round's bands —
 * a fund telling an LP what it has allocated must not be counting money it took off the table.
 * So are converted pledges, which are deployed capital and are reported by the portfolio instead.
 *
 * The page reads these figures from the server so they cover the whole book; this function is the
 * same arithmetic, kept for the fixture server to answer the summary endpoint with and for the
 * tests that pin the rules down.
 */
export const bookTotals = (commitments: FundingCommitmentDTO[]): BookTotals => {
  const committed: Record<string, number> = {}
  const likely: Record<string, number> = {}
  let liveCount = 0
  let readyToRecordCount = 0

  for (const item of commitments) {
    if (isConvertible(item)) readyToRecordCount += 1
    if (!isLive(item)) continue
    liveCount += 1
    if (item.status === CommitmentStatus.COMMITTED) {
      committed[item.currency] = (committed[item.currency] ?? 0) + item.amount
    }
    if (
      item.status === CommitmentStatus.COMMITTED ||
      item.status === CommitmentStatus.SOFT_COMMITTED
    ) {
      likely[item.currency] = (likely[item.currency] ?? 0) + item.amount
    }
  }
  return { committed, likely, liveCount, readyToRecordCount }
}

/**
 * Why this pledge would be refused, or null if it wouldn't.
 *
 * The same three rules the server enforces, checked here so the form can say so before the
 * request: a round takes money only in its own currency and only inside its ticket band. The
 * server stays the gate — this only decides whether to let the user press the button, and the
 * messages are deliberately the server's wording so the two never contradict each other.
 */
export const ticketProblem = (
  cycle: Pick<FundingCycleDTO, 'currency' | 'minTicketSize' | 'maxTicketSize'>,
  amount: number,
  currency: string,
  formatAmount: (value: number, currency: string) => string,
): string | null => {
  if (currency !== cycle.currency) return `This round is raising in ${cycle.currency}.`
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount above zero.'
  if (cycle.minTicketSize !== null && amount < cycle.minTicketSize) {
    return `This round's minimum ticket is ${formatAmount(cycle.minTicketSize, cycle.currency)}.`
  }
  if (cycle.maxTicketSize !== null && amount > cycle.maxTicketSize) {
    return `This round's maximum ticket is ${formatAmount(cycle.maxTicketSize, cycle.currency)}.`
  }
  return null
}

/**
 * Why this round's ticket band is unusable, or null if it's fine.
 *
 * A band that can't contain anything is a typo, not a configuration — the server refuses it and
 * so does a CHECK constraint, but neither reaches the founder until they press Save.
 */
export const ticketBandProblem = (min: number | null, max: number | null): string | null =>
  min !== null && max !== null && min > max
    ? "The minimum ticket can't be larger than the maximum."
    : null

/** One point on the momentum chart: the round's standing at a moment in time. */
export interface RoundFillPoint {
  /** ISO timestamp. The chart formats it; the shape stays locale-free and testable. */
  at: string
  committed: number
  softCommitted: number
  indicated: number
  /** All three bands together — the height of the stack. */
  pledged: number
}

/**
 * How a round filled, replayed from its event log.
 *
 * The bands on a round are a snapshot the server recomputes; this is the same arithmetic run
 * forward through history, so the last point of the series matches what the round reports today.
 *
 * Each event carries the commitment's state *after* the move, so replaying means holding the
 * latest state per commitment and re-totalling — not adding deltas. That matters because a firm
 * can both raise its number and change band in one move, and because a withdrawal has to remove
 * the whole pledge from the stack rather than subtract something.
 *
 * `openedAt` seeds a zero point so the chart starts at the round opening rather than at whatever
 * moment the first investor happened to appear.
 */
export const roundFillSeries = (
  events: CommitmentEventDTO[],
  openedAt?: string,
): RoundFillPoint[] => {
  const latest = new Map<string, { status: CommitmentStatus; amount: number }>()
  const points: RoundFillPoint[] = []

  if (openedAt) {
    points.push({ at: openedAt, committed: 0, softCommitted: 0, indicated: 0, pledged: 0 })
  }

  const ordered = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  for (const event of ordered) {
    latest.set(event.commitmentId, { status: event.toStatus, amount: event.toAmount })

    let committed = 0
    let softCommitted = 0
    let indicated = 0
    for (const state of latest.values()) {
      if (state.status === CommitmentStatus.COMMITTED) committed += state.amount
      else if (state.status === CommitmentStatus.SOFT_COMMITTED) softCommitted += state.amount
      else if (state.status === CommitmentStatus.INDICATED) indicated += state.amount
      // WITHDRAWN falls through: it counts toward nothing, exactly as on the server.
    }

    const point: RoundFillPoint = {
      at: event.occurredAt,
      committed,
      softCommitted,
      indicated,
      pledged: committed + softCommitted + indicated,
    }

    // Two moves at the same instant are one step on the chart, not a vertical line.
    const previous = points[points.length - 1]
    if (previous && previous.at === point.at) points[points.length - 1] = point
    else points.push(point)
  }

  return points
}
