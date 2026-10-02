import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CompanyBreakdown } from './CompanyBreakdown'
import { InvestmentRound, InvestmentStatus } from '@/features/investments/types'
import type { InvestmentDTO } from '@/features/investments/types'

const investment = (overrides: Partial<InvestmentDTO>): InvestmentDTO => ({
  id: Math.random().toString(36).slice(2),
  vcFirmId: 'firm',
  startupId: 'startup-1',
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

const renderBreakdown = (investments: InvestmentDTO[], currency = 'INR') =>
  render(
    <MemoryRouter>
      <CompanyBreakdown investments={investments} currency={currency} />
    </MemoryRouter>
  )

describe('CompanyBreakdown', () => {
  it('merges follow-ons into one name — more capital in one company, not two', () => {
    renderBreakdown([
      investment({ startupId: 'a', startupName: 'Ledgerly', amount: 10_000_000, round: InvestmentRound.SEED }),
      investment({
        startupId: 'a',
        startupName: 'Ledgerly',
        amount: 20_000_000,
        round: InvestmentRound.SERIES_A,
        investmentDate: '2026-01-01',
      }),
    ])

    expect(screen.getAllByText('Ledgerly')).toHaveLength(1)
    expect(screen.getByText('2 rounds')).toBeInTheDocument()
    // 1 Cr + 2 Cr, as one position. The figure is in the DOM twice by design —
    // a desktop column and a phone row, with CSS choosing which is visible.
    expect(screen.getAllByText('₹3.00 Cr').length).toBeGreaterThan(0)
  })

  it('ranks by capital and states each share of the book', () => {
    renderBreakdown([
      investment({ startupId: 'a', startupName: 'Small', amount: 10_000_000 }),
      investment({ startupId: 'b', startupName: 'Large', amount: 30_000_000 }),
    ])

    const names = screen.getAllByRole('link').map((link) => link.textContent)
    expect(names).toEqual(['Large', 'Small'])
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('takes its status and date from the most recent round', () => {
    renderBreakdown([
      investment({
        startupId: 'a',
        amount: 10_000_000,
        investmentDate: '2024-01-01',
        status: InvestmentStatus.ACTIVE,
      }),
      investment({
        startupId: 'a',
        amount: 10_000_000,
        investmentDate: '2026-02-01',
        status: InvestmentStatus.EXITED,
      }),
    ])

    expect(screen.getByText('Exited')).toBeInTheDocument()
  })

  it('leaves out other currencies rather than adding them together', () => {
    renderBreakdown([
      investment({ startupId: 'a', startupName: 'Rupees', amount: 10_000_000, currency: 'INR' }),
      investment({ startupId: 'b', startupName: 'Dollars', amount: 90_000_000, currency: 'USD' }),
    ])

    expect(screen.getByText('Rupees')).toBeInTheDocument()
    expect(screen.queryByText('Dollars')).not.toBeInTheDocument()
  })

  it('collapses the tail behind a control instead of running down the page', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      investment({
        startupId: `company-${index}`,
        startupName: `Company ${index}`,
        amount: (12 - index) * 1_000_000,
      })
    )
    renderBreakdown(many)

    expect(screen.getAllByRole('link')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Show all 12 companies' })).toBeInTheDocument()
  })

  it('renders nothing when there is no position in this currency', () => {
    const { container } = renderBreakdown([investment({ currency: 'USD' })], 'INR')
    expect(container).toBeEmptyDOMElement()
  })
})
