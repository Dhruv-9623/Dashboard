import { describe, expect, it } from 'vitest'
import { InvestmentRound, roundLabel } from './types'

describe('roundLabel', () => {
  it('turns the API enum into the label a person reads', () => {
    expect(roundLabel(InvestmentRound.SERIES_A)).toBe('Series A')
    expect(roundLabel('PRE_SEED')).toBe('Pre-Seed')
    expect(roundLabel('SERIES_E_PLUS')).toBe('Series E+')
  })

  it('renders an em dash for a round that is absent', () => {
    // The founder dashboard asks for the open round's type before any round exists.
    expect(roundLabel(null)).toBe('—')
    expect(roundLabel(undefined)).toBe('—')
  })

  it('passes through an unrecognised value rather than blanking it', () => {
    // A round type the frontend has not been taught yet should still show something.
    expect(roundLabel('SERIES_Z')).toBe('SERIES_Z')
  })

  it('never leaves an underscored enum on screen for a known round', () => {
    for (const round of Object.values(InvestmentRound)) {
      expect(roundLabel(round)).not.toMatch(/_/)
    }
  })
})
