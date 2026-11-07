const SECTORS = [
  'Fintech',
  'SaaS',
  'Healthtech',
  'Consumer',
  'D2C',
  'Deeptech',
  'AI/ML',
  'Climate',
  'Edtech',
  'Logistics',
  'Marketplace',
  'Gaming',
  'Cybersecurity',
  'Agritech',
] as const

export const STAGES = [
  { value: 'PRE_SEED', label: 'Pre-Seed' },
  { value: 'SEED', label: 'Seed' },
  { value: 'SERIES_A', label: 'Series A' },
  { value: 'SERIES_B', label: 'Series B' },
  { value: 'SERIES_C_PLUS', label: 'Series C+' },
  { value: 'GROWTH', label: 'Growth' },
] as const

/**
 * Assets under management is typed in crore but stored in rupees, like every other amount in the
 * system.
 *
 * The form said "AUM (₹ crore)" and wrote the number straight through, so a firm holding ₹450
 * crore displayed as 4500000000 in a field labelled crore. Two other places disagreed again — the
 * firm profile multiplied the same value by a million. One unit in the data, converted only at the
 * input that asks for crore.
 */
export const CRORE = 10_000_000

/** Rupees to crore, for display. Trailing zeros are dropped: 4_500_000_000 -> "450". */
export const toCroreInput = (rupees: number | null | undefined) =>
  rupees == null ? '' : String(Number((rupees / CRORE).toFixed(4)))

/** Crore back to whole rupees, for saving. */
export const fromCroreInput = (crore: string) =>
  crore.trim() === '' ? undefined : Math.round(Number(crore) * CRORE)

export const CURRENCIES = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
] as const

export const sectorOptions = SECTORS.map((sector) => ({ value: sector, label: sector }))

/** The inverse of {@link stageLabel}: the firm profile stores a stage by its label. */
export const stageValue = (label: string) =>
  STAGES.find((entry) => entry.label === label)?.value ?? label

export const stageLabel = (stage: string) =>
  STAGES.find((entry) => entry.value === stage)?.label ?? stage

const currencySymbols: Record<string, string> = { INR: '₹', USD: '$' }

export const formatMoney = (amount: number | null | undefined, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—'

  const symbol = currencySymbols[currency] ?? ''
  if (currency === 'INR') {
    if (amount >= 10_000_000) return `${symbol}${(amount / 10_000_000).toFixed(2)} Cr`
    if (amount >= 100_000) return `${symbol}${(amount / 100_000).toFixed(2)} L`
  } else if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  }

  return `${symbol}${amount.toLocaleString('en-IN')}`
}

/**
 * Money at axis-tick size: magnitude only, no decimals, so it fits a narrow
 * gutter without wrapping. The tooltip and the figures carry the precision.
 */
export const formatMoneyShort = (amount: number, currency = 'INR') => {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : ''
  if (currency === 'INR') {
    if (amount >= 10_000_000) return `${symbol}${Math.round(amount / 10_000_000)}Cr`
    if (amount >= 100_000) return `${symbol}${Math.round(amount / 100_000)}L`
    if (amount >= 1_000) return `${symbol}${Math.round(amount / 1_000)}k`
  } else if (amount >= 1_000_000) {
    return `${symbol}${Math.round(amount / 1_000_000)}M`
  } else if (amount >= 1_000) {
    return `${symbol}${Math.round(amount / 1_000)}k`
  }
  return `${symbol}${Math.round(amount)}`
}

/**
 * Totals money per currency instead of adding INR and USD together.
 * Returns e.g. "₹35.00 Cr" or "₹35.00 Cr + $2.00M".
 */
export const formatMoneyTotals = (
  items: ReadonlyArray<{ amount: number; currency: string }>,
  emptyCurrency = 'INR'
) => {
  if (items.length === 0) return formatMoney(0, emptyCurrency)

  const totals: Record<string, number> = {}
  for (const { amount, currency } of items) {
    totals[currency] = (totals[currency] ?? 0) + amount
  }
  return formatCurrencyTotals(totals, emptyCurrency)
}

/** Formats server-computed per-currency totals, e.g. `{ INR: 350000000, USD: 2000000 }`. */
export const formatCurrencyTotals = (totals: Record<string, number>, emptyCurrency = 'INR') => {
  const entries = Object.entries(totals)
  if (entries.length === 0) return formatMoney(0, emptyCurrency)
  return entries.map(([currency, total]) => formatMoney(total, currency)).join(' + ')
}

/** `pluralize(1, 'request')` → "1 request", `pluralize(3, 'match', 'matches')` → "3 matches". */
export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
