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

export const CURRENCIES = [
  { value: 'INR', label: '₹ INR' },
  { value: 'USD', label: '$ USD' },
] as const

export const sectorOptions = SECTORS.map((sector) => ({ value: sector, label: sector }))

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
