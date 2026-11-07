import { describe, expect, it } from 'vitest'
import {
  CommitmentStatus,
  FundingCycleStatus,
  isConvertible,
  isConverted,
  roundFillSeries,
} from './types'
import type { CommitmentEventDTO, FundingCommitmentDTO } from './types'

let sequence = 0

/** One move in a round's history. `from` omitted means the pledge was made here. */
const move = (
  commitmentId: string,
  toStatus: CommitmentStatus,
  toAmount: number,
  occurredAt: string,
  from?: { status: CommitmentStatus; amount: number },
): CommitmentEventDTO => ({
  id: `ce-${++sequence}`,
  commitmentId,
  vcFirmId: 'f-1',
  vcFirmName: 'Meridian Ventures',
  fromStatus: from?.status ?? null,
  fromAmount: from?.amount ?? null,
  toStatus,
  toAmount,
  currency: 'INR',
  occurredAt,
})

describe('roundFillSeries', () => {
  it('replays a pledge as a step onto the indicated band', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.INDICATED, 10_000_000, '2026-03-01T00:00:00Z'),
    ])

    expect(series).toHaveLength(1)
    expect(series[0]).toMatchObject({ indicated: 10_000_000, committed: 0, pledged: 10_000_000 })
  })

  it('moves money between bands rather than adding it twice', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.INDICATED, 10_000_000, '2026-03-01T00:00:00Z'),
      move('c-1', CommitmentStatus.COMMITTED, 10_000_000, '2026-03-05T00:00:00Z', {
        status: CommitmentStatus.INDICATED,
        amount: 10_000_000,
      }),
    ])

    // The same firm's pledge promoted, so the total is unchanged and only the split moved. An
    // implementation that summed deltas would report ₹2 Cr pledged here.
    expect(series[1]).toMatchObject({
      indicated: 0,
      committed: 10_000_000,
      pledged: 10_000_000,
    })
  })

  it('follows an investor who raises its number in the same band', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.COMMITTED, 10_000_000, '2026-03-01T00:00:00Z'),
      move('c-1', CommitmentStatus.COMMITTED, 25_000_000, '2026-03-09T00:00:00Z', {
        status: CommitmentStatus.COMMITTED,
        amount: 10_000_000,
      }),
    ])

    expect(series[1].committed).toBe(25_000_000)
    expect(series[1].pledged).toBe(25_000_000)
  })

  it('drops a withdrawal out of the stack entirely', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.COMMITTED, 30_000_000, '2026-03-01T00:00:00Z'),
      move('c-2', CommitmentStatus.SOFT_COMMITTED, 8_000_000, '2026-03-02T00:00:00Z'),
      move('c-2', CommitmentStatus.WITHDRAWN, 8_000_000, '2026-03-10T00:00:00Z', {
        status: CommitmentStatus.SOFT_COMMITTED,
        amount: 8_000_000,
      }),
    ])

    expect(series[1].pledged).toBe(38_000_000)
    // The whole pledge leaves, exactly as the server excludes it from every band.
    expect(series[2]).toMatchObject({ committed: 30_000_000, softCommitted: 0, pledged: 30_000_000 })
  })

  it('keeps several investors apart', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.COMMITTED, 15_000_000, '2026-03-01T00:00:00Z'),
      move('c-2', CommitmentStatus.SOFT_COMMITTED, 25_000_000, '2026-03-04T00:00:00Z'),
      move('c-3', CommitmentStatus.INDICATED, 7_000_000, '2026-03-08T00:00:00Z'),
    ])

    expect(series[2]).toMatchObject({
      committed: 15_000_000,
      softCommitted: 25_000_000,
      indicated: 7_000_000,
      pledged: 47_000_000,
    })
  })

  it('sorts events it is handed out of order', () => {
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.COMMITTED, 20_000_000, '2026-03-09T00:00:00Z', {
        status: CommitmentStatus.INDICATED,
        amount: 20_000_000,
      }),
      move('c-1', CommitmentStatus.INDICATED, 20_000_000, '2026-03-01T00:00:00Z'),
    ])

    // Replaying in the wrong order would end on the indication and understate the round.
    expect(series[0].indicated).toBe(20_000_000)
    expect(series[1].committed).toBe(20_000_000)
  })

  it('collapses two moves at the same instant into one step', () => {
    const at = '2026-03-01T00:00:00Z'
    const series = roundFillSeries([
      move('c-1', CommitmentStatus.COMMITTED, 10_000_000, at),
      move('c-2', CommitmentStatus.COMMITTED, 5_000_000, at),
    ])

    // One x position, so the chart draws a step rather than a vertical line.
    expect(series).toHaveLength(1)
    expect(series[0].committed).toBe(15_000_000)
  })

  it('starts at zero on the day the round opened', () => {
    const series = roundFillSeries(
      [move('c-1', CommitmentStatus.COMMITTED, 10_000_000, '2026-03-05T00:00:00Z')],
      '2026-03-01T00:00:00Z',
    )

    expect(series[0]).toMatchObject({ at: '2026-03-01T00:00:00Z', pledged: 0 })
    expect(series[1].pledged).toBe(10_000_000)
  })

  it('is empty for a round nothing has happened on', () => {
    expect(roundFillSeries([])).toEqual([])
  })
})

const pledge = (
  overrides: Partial<FundingCommitmentDTO> = {},
): FundingCommitmentDTO => ({
  id: 'c-1',
  fundingCycleId: 'fc-1',
  vcFirmId: 'f-1',
  vcFirmName: null,
  amount: 50_000_000,
  currency: 'INR',
  status: CommitmentStatus.COMMITTED,
  committedAt: '2026-03-01T00:00:00Z',
  startupId: 's-1',
  startupName: 'Freightwise',
  roundType: 'SERIES_A',
  cycleStatus: FundingCycleStatus.CLOSED,
  cycleTargetAmount: 200_000_000,
  cycleClosedAt: '2026-03-20T00:00:00Z',
  convertedInvestmentId: null,
  ...overrides,
})

describe('isConvertible', () => {
  it('is true for a committed pledge on a closed round', () => {
    expect(isConvertible(pledge())).toBe(true)
  })

  it('is false while the round is still open', () => {
    expect(isConvertible(pledge({ cycleStatus: FundingCycleStatus.OPEN }))).toBe(false)
  })

  it('is false for anything short of committed', () => {
    expect(isConvertible(pledge({ status: CommitmentStatus.SOFT_COMMITTED }))).toBe(false)
    expect(isConvertible(pledge({ status: CommitmentStatus.INDICATED }))).toBe(false)
    expect(isConvertible(pledge({ status: CommitmentStatus.WITHDRAWN }))).toBe(false)
  })

  it('is false once it has been recorded', () => {
    const recorded = pledge({ convertedInvestmentId: 'i-9' })
    expect(isConverted(recorded)).toBe(true)
    // Otherwise one pledge could be clicked into two portfolio rows.
    expect(isConvertible(recorded)).toBe(false)
  })

  it('is false on a round investor list, where there is no round context', () => {
    // `cycleStatus` is null outside the firm's own book, so the action can't appear there.
    expect(isConvertible(pledge({ cycleStatus: null }))).toBe(false)
  })
})
