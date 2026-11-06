import { describe, expect, it } from 'vitest'
import {
  bookTotals,
  CommitmentStatus,
  FundingCycleStatus,
  isLive,
  ticketBandProblem,
  ticketProblem,
} from './types'
import type { FundingCommitmentDTO } from './types'

const pledge = (
  amount: number,
  status: CommitmentStatus,
  currency = 'INR'
): FundingCommitmentDTO => ({
  id: crypto.randomUUID(),
  fundingCycleId: 'fc-1',
  vcFirmId: 'f-1',
  vcFirmName: null,
  amount,
  currency,
  status,
  committedAt: '2026-10-01T00:00:00Z',
  startupId: 's-1',
  startupName: 'Lumen Health',
  roundType: 'SEED',
  cycleStatus: null,
  cycleTargetAmount: 80_000_000,
  cycleClosedAt: null,
  convertedInvestmentId: null,
})

describe('ticketProblem', () => {
  const money = (value: number, currency: string) => `${currency} ${value}`
  const round = { currency: 'INR', minTicketSize: 5_000_000, maxTicketSize: 30_000_000 }

  it('accepts an amount inside the band', () => {
    expect(ticketProblem(round, 10_000_000, 'INR', money)).toBeNull()
  })

  it('refuses an amount below the minimum', () => {
    // The bug: "10" went through on a round with a ₹50 L floor, because nothing checked.
    expect(ticketProblem(round, 10, 'INR', money)).toContain('minimum ticket')
  })

  it('refuses an amount above the maximum', () => {
    expect(ticketProblem(round, 500_000_000, 'INR', money)).toContain('maximum ticket')
  })

  it('refuses the wrong currency before anything else', () => {
    expect(ticketProblem(round, 10_000_000, 'USD', money)).toContain('raising in INR')
  })

  it('refuses zero and nonsense', () => {
    expect(ticketProblem(round, 0, 'INR', money)).toContain('above zero')
    expect(ticketProblem(round, Number.NaN, 'INR', money)).toContain('above zero')
  })

  it('allows anything positive when the round sets no band', () => {
    const open = { currency: 'INR', minTicketSize: null, maxTicketSize: null }
    expect(ticketProblem(open, 1, 'INR', money)).toBeNull()
  })

  it('accepts the boundaries themselves', () => {
    expect(ticketProblem(round, 5_000_000, 'INR', money)).toBeNull()
    expect(ticketProblem(round, 30_000_000, 'INR', money)).toBeNull()
  })
})

describe('ticketBandProblem', () => {
  it('refuses a band that cannot contain anything', () => {
    // ₹9 Cr minimum with a ₹4 Cr maximum used to save.
    expect(ticketBandProblem(90_000_000, 40_000_000)).toContain("can't be larger")
  })

  it('allows a band with one side open, or none', () => {
    expect(ticketBandProblem(90_000_000, null)).toBeNull()
    expect(ticketBandProblem(null, 40_000_000)).toBeNull()
    expect(ticketBandProblem(null, null)).toBeNull()
  })

  it('allows equal bounds — a round with one ticket size', () => {
    expect(ticketBandProblem(10_000_000, 10_000_000)).toBeNull()
  })
})

describe('bookTotals', () => {
  it('keeps signed money apart from money that is still a conversation', () => {
    const totals = bookTotals([
      pledge(30_000_000, CommitmentStatus.COMMITTED),
      pledge(25_000_000, CommitmentStatus.SOFT_COMMITTED),
      pledge(9_000_000, CommitmentStatus.INDICATED),
    ])

    expect(totals.committed.INR).toBe(30_000_000)
    // Committed + soft. The indication is not in here on purpose.
    expect(totals.likely.INR).toBe(55_000_000)
    expect(totals.liveCount).toBe(3)
  })

  it('excludes a withdrawn pledge from both figures and from the count', () => {
    const totals = bookTotals([
      pledge(30_000_000, CommitmentStatus.COMMITTED),
      pledge(8_000_000, CommitmentStatus.WITHDRAWN),
    ])

    expect(totals.committed.INR).toBe(30_000_000)
    expect(totals.likely.INR).toBe(30_000_000)
    expect(totals.liveCount).toBe(1)
  })

  it('never reports a withdrawn-only book as having money in it', () => {
    const totals = bookTotals([
      pledge(8_000_000, CommitmentStatus.WITHDRAWN),
      pledge(5_000_000, CommitmentStatus.WITHDRAWN),
    ])

    expect(totals.committed).toEqual({})
    expect(totals.likely).toEqual({})
    expect(totals.liveCount).toBe(0)
  })

  it('keeps currencies separate rather than inventing a combined exposure', () => {
    const totals = bookTotals([
      pledge(30_000_000, CommitmentStatus.COMMITTED, 'INR'),
      pledge(500_000, CommitmentStatus.COMMITTED, 'USD'),
    ])

    expect(totals.committed).toEqual({ INR: 30_000_000, USD: 500_000 })
  })

  it('is empty for an empty book', () => {
    expect(bookTotals([])).toEqual({
      committed: {},
      likely: {},
      liveCount: 0,
      readyToRecordCount: 0,
    })
  })
})

describe('isLive', () => {
  it('counts every band on the ladder and nothing off it', () => {
    expect(isLive(pledge(1, CommitmentStatus.INDICATED))).toBe(true)
    expect(isLive(pledge(1, CommitmentStatus.SOFT_COMMITTED))).toBe(true)
    expect(isLive(pledge(1, CommitmentStatus.COMMITTED))).toBe(true)
    expect(isLive(pledge(1, CommitmentStatus.WITHDRAWN))).toBe(false)
  })
})

describe('bookTotals and money already deployed', () => {
  it('drops a converted pledge out of every figure', () => {
    const recorded = { ...pledge(50_000_000, CommitmentStatus.COMMITTED), convertedInvestmentId: 'i-9' }
    const totals = bookTotals([pledge(30_000_000, CommitmentStatus.COMMITTED), recorded])

    // The page reports money promised and *not* deployed. Counting a recorded cheque here as
    // well as on the portfolio page reported the same ₹5 Cr twice across two screens.
    expect(totals.committed.INR).toBe(30_000_000)
    expect(totals.likely.INR).toBe(30_000_000)
    expect(totals.liveCount).toBe(1)
  })

  it('counts pledges waiting to be recorded', () => {
    const closedRound = {
      ...pledge(50_000_000, CommitmentStatus.COMMITTED),
      cycleStatus: FundingCycleStatus.CLOSED,
    }
    const totals = bookTotals([
      closedRound,
      { ...closedRound, convertedInvestmentId: 'i-9' },
      pledge(30_000_000, CommitmentStatus.COMMITTED),
    ])

    // One of the three: the closed-round pledge that hasn't been recorded yet.
    expect(totals.readyToRecordCount).toBe(1)
  })

  it('is zero when nothing is waiting', () => {
    expect(bookTotals([pledge(30_000_000, CommitmentStatus.COMMITTED)]).readyToRecordCount).toBe(0)
  })
})
