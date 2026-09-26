import { describe, expect, it } from 'vitest'
import {
  cumulativeDeployed,
  dealsPerQuarter,
  dominantCurrency,
  sectorExposure,
  sparkValues,
} from './portfolioSeries'
import { InvestmentRound, InvestmentStatus } from './types'
import type { InvestmentDTO } from './types'

const investment = (overrides: Partial<InvestmentDTO>): InvestmentDTO => ({
  id: Math.random().toString(36).slice(2),
  vcFirmId: 'firm',
  startupId: 'startup',
  startupName: 'Ledgerly',
  startupSector: 'Fintech',
  startupLogoUrl: null,
  investmentDate: '2025-01-15',
  amount: 10_000_000,
  currency: 'INR',
  round: InvestmentRound.SEED,
  equityPercentage: 5,
  status: InvestmentStatus.ACTIVE,
  notes: null,
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
  ...overrides,
})

describe('dominantCurrency', () => {
  it('picks the currency holding the most capital, not the most deals', () => {
    const records = [
      investment({ currency: 'INR', amount: 1_000_000 }),
      investment({ currency: 'INR', amount: 1_000_000 }),
      investment({ currency: 'USD', amount: 5_000_000 }),
    ]
    expect(dominantCurrency(records)).toBe('USD')
  })

  it('returns null for an empty portfolio rather than a made-up default', () => {
    expect(dominantCurrency([])).toBeNull()
  })
})

describe('cumulativeDeployed', () => {
  it('runs a total forward through the months', () => {
    const series = cumulativeDeployed(
      [
        investment({ investmentDate: '2025-01-10', amount: 1_000_000 }),
        investment({ investmentDate: '2025-03-20', amount: 2_000_000 }),
      ],
      'INR'
    )

    expect(series.map((point) => [point.period, point.value])).toEqual([
      ['2025-01', 1_000_000],
      // February has no deal, so the running total holds rather than dipping.
      ['2025-02', 1_000_000],
      ['2025-03', 3_000_000],
    ])
  })

  it('fills the empty months so a gap reads as flat, not as a missing tick', () => {
    const series = cumulativeDeployed(
      [
        investment({ investmentDate: '2024-11-01' }),
        investment({ investmentDate: '2025-02-01' }),
      ],
      'INR'
    )
    expect(series.map((point) => point.period)).toEqual(['2024-11', '2024-12', '2025-01', '2025-02'])
  })

  it('never mixes currencies into one line', () => {
    const series = cumulativeDeployed(
      [
        investment({ currency: 'INR', amount: 1_000_000, investmentDate: '2025-01-05' }),
        investment({ currency: 'USD', amount: 9_000_000, investmentDate: '2025-01-06' }),
      ],
      'INR'
    )
    expect(series.at(-1)?.value).toBe(1_000_000)
  })

  it('labels months readably', () => {
    const series = cumulativeDeployed([investment({ investmentDate: '2026-03-02' })], 'INR')
    expect(series[0].label).toBe('Mar 26')
  })

  it('returns nothing when the currency has no positions', () => {
    expect(cumulativeDeployed([investment({ currency: 'INR' })], 'EUR')).toEqual([])
  })
})

describe('dealsPerQuarter', () => {
  it('counts cheques per quarter and spans the empty ones', () => {
    const series = dealsPerQuarter([
      investment({ investmentDate: '2025-01-15' }),
      investment({ investmentDate: '2025-02-20' }),
      investment({ investmentDate: '2025-08-01' }),
    ])

    expect(series.map((point) => [point.label, point.value])).toEqual([
      ['Q1 25', 2],
      ['Q2 25', 0],
      ['Q3 25', 1],
    ])
  })

  it('crosses a year boundary', () => {
    const series = dealsPerQuarter([
      investment({ investmentDate: '2024-11-01' }),
      investment({ investmentDate: '2025-02-01' }),
    ])
    expect(series.map((point) => point.label)).toEqual(['Q4 24', 'Q1 25'])
  })
})

describe('sectorExposure', () => {
  it('ranks sectors by capital and gives each a share', () => {
    const sectors = sectorExposure(
      [
        investment({ startupSector: 'Fintech', amount: 3_000_000 }),
        investment({ startupSector: 'SaaS', amount: 1_000_000 }),
      ],
      'INR'
    )

    expect(sectors.map((sector) => sector.label)).toEqual(['Fintech', 'SaaS'])
    expect(sectors[0].share).toBeCloseTo(0.75)
  })

  it('leaves write-offs out — that money is gone, not exposure', () => {
    const sectors = sectorExposure(
      [
        investment({ startupSector: 'Fintech', amount: 1_000_000 }),
        investment({
          startupSector: 'Climate',
          amount: 9_000_000,
          status: InvestmentStatus.WRITTEN_OFF,
        }),
      ],
      'INR'
    )

    expect(sectors).toHaveLength(1)
    expect(sectors[0].label).toBe('Fintech')
  })

  it('buckets a missing sector rather than rendering a blank row', () => {
    const sectors = sectorExposure([investment({ startupSector: '  ' })], 'INR')
    expect(sectors[0].label).toBe('Unspecified')
  })
})

describe('sparkValues', () => {
  it('needs at least two points to have a shape', () => {
    expect(sparkValues([{ period: '2025-01', label: 'Jan 25', value: 5 }])).toEqual([])
  })

  it('takes the most recent window', () => {
    const series = Array.from({ length: 20 }, (_, index) => ({
      period: `2025-${String(index + 1).padStart(2, '0')}`,
      label: 'x',
      value: index,
    }))
    expect(sparkValues(series, 3)).toEqual([17, 18, 19])
  })
})
