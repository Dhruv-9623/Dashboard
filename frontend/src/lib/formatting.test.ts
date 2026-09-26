import { describe, expect, it } from 'vitest'
import { formatCurrencyTotals, formatMoney, formatMoneyTotals, pluralize, stageLabel } from './constants'
import { safeUrl } from './utils'

describe('formatMoney', () => {
  it('uses lakh and crore for rupees', () => {
    expect(formatMoney(350_000_000)).toBe('₹35.00 Cr')
    expect(formatMoney(2_500_000)).toBe('₹25.00 L')
    expect(formatMoney(4_200)).toBe('₹4,200')
  })

  it('uses millions for other currencies', () => {
    expect(formatMoney(2_000_000, 'USD')).toBe('$2.00M')
  })

  it('shows an em dash rather than ₹0 when there is no figure', () => {
    // ₹0 reads as a real, empty portfolio; "—" reads as "not known".
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })

  it('still prints a genuine zero', () => {
    expect(formatMoney(0)).toBe('₹0')
  })
})

describe('per-currency totals', () => {
  it('never adds two currencies into one number', () => {
    expect(
      formatMoneyTotals([
        { amount: 300_000_000, currency: 'INR' },
        { amount: 50_000_000, currency: 'INR' },
        { amount: 2_000_000, currency: 'USD' },
      ])
    ).toBe('₹35.00 Cr + $2.00M')
  })

  it('falls back to a zero in the default currency when there is nothing', () => {
    expect(formatMoneyTotals([])).toBe('₹0')
    expect(formatCurrencyTotals({})).toBe('₹0')
  })

  it('formats the server-computed summary map', () => {
    expect(formatCurrencyTotals({ INR: 350_000_000, USD: 2_000_000 })).toBe('₹35.00 Cr + $2.00M')
  })
})

describe('labels', () => {
  it('pluralizes, including irregular plurals', () => {
    expect(pluralize(1, 'connection request')).toBe('1 connection request')
    expect(pluralize(3, 'connection request')).toBe('3 connection requests')
    expect(pluralize(0, 'match', 'matches')).toBe('0 matches')
  })

  it('turns an enum value into something readable', () => {
    expect(stageLabel('SERIES_A')).toBe('Series A')
  })

  it('passes an unknown value through rather than rendering nothing', () => {
    expect(stageLabel('TERTIARY')).toBe('TERTIARY')
  })
})

describe('safeUrl', () => {
  it('allows http and https links', () => {
    expect(safeUrl('https://ledgerly.example.com')).toBe('https://ledgerly.example.com/')
    expect(safeUrl('http://ledgerly.example.com')).toBe('http://ledgerly.example.com/')
  })

  it('blocks script-bearing schemes that React would render as-is', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('JavaScript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeUrl('vbscript:msgbox(1)')).toBeUndefined()
  })

  it('rejects anything that is not an absolute URL', () => {
    expect(safeUrl('ledgerly.example.com')).toBeUndefined()
    expect(safeUrl('/pitch-deck.pdf')).toBeUndefined()
    expect(safeUrl('')).toBeUndefined()
    expect(safeUrl(null)).toBeUndefined()
    expect(safeUrl(undefined)).toBeUndefined()
  })
})
