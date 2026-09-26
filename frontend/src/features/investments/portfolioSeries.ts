import type { InvestmentDTO } from './types'
import { InvestmentStatus } from './types'

/**
 * Turns the investment list into the series the dashboard charts read.
 *
 * Everything here is derived from records the page has already loaded — an
 * investment carries its date, amount, currency, sector and status — so the
 * charts show real history without a new endpoint and without inventing a
 * single number. When the API grows a proper time-series endpoint these become
 * the shape it should return.
 *
 * Two deliberate limits, both of which the callers surface rather than hide:
 *   - **Only the page in hand.** The list is paged; these functions describe
 *     the investments given to them, not necessarily the whole portfolio.
 *   - **One currency per chart.** Adding INR to USD would be a lie, so a series
 *     is always built for a single currency — the one with the most capital.
 */

export interface TimePoint {
  /** ISO month, `2026-03`. Sorts lexicographically, which is why it's a string. */
  period: string
  /** Human label for the axis, `Mar 26`. */
  label: string
  value: number
}

export interface CategoryPoint {
  label: string
  value: number
  share: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const monthKey = (iso: string) => iso.slice(0, 7)

const monthLabel = (period: string) => {
  const [year, month] = period.split('-')
  return `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`
}

/** Every month from the first to the last, so gaps render as flat, not as a skipped tick. */
function monthsBetween(first: string, last: string): string[] {
  const months: string[] = []
  let [year, month] = first.split('-').map(Number)
  const [lastYear, lastMonth] = last.split('-').map(Number)

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

/** The currency holding the most capital — the one a single-axis chart can honestly show. */
export function dominantCurrency(investments: InvestmentDTO[]): string | null {
  if (investments.length === 0) return null
  const totals = new Map<string, number>()
  for (const investment of investments) {
    totals.set(investment.currency, (totals.get(investment.currency) ?? 0) + investment.amount)
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Cumulative capital deployed, month by month, in one currency.
 *
 * Cumulative rather than per-month because the question a partner asks of this
 * chart is "how much have we put to work, and how fast", which a running total
 * answers and a spiky monthly bar chart doesn't.
 */
export function cumulativeDeployed(investments: InvestmentDTO[], currency: string): TimePoint[] {
  const relevant = investments
    .filter((investment) => investment.currency === currency)
    .sort((a, b) => a.investmentDate.localeCompare(b.investmentDate))

  if (relevant.length === 0) return []

  const perMonth = new Map<string, number>()
  for (const investment of relevant) {
    const key = monthKey(investment.investmentDate)
    perMonth.set(key, (perMonth.get(key) ?? 0) + investment.amount)
  }

  const first = monthKey(relevant[0].investmentDate)
  const last = monthKey(relevant[relevant.length - 1].investmentDate)

  let running = 0
  return monthsBetween(first, last).map((period) => {
    running += perMonth.get(period) ?? 0
    return { period, label: monthLabel(period), value: running }
  })
}

/**
 * How many cheques were written each quarter — the pace, independent of size.
 *
 * Quarters rather than months: a fund's own cadence is quarterly, and monthly
 * buckets over a multi-year history are mostly zeros with single-deal spikes,
 * which renders as slivers rather than a shape.
 */
export function dealsPerQuarter(investments: InvestmentDTO[]): TimePoint[] {
  if (investments.length === 0) return []

  const quarterOf = (iso: string) => {
    const [year, month] = iso.slice(0, 7).split('-').map(Number)
    return { year, quarter: Math.floor((month - 1) / 3) + 1 }
  }
  const key = ({ year, quarter }: { year: number; quarter: number }) => `${year}-Q${quarter}`

  const sorted = [...investments].sort((a, b) => a.investmentDate.localeCompare(b.investmentDate))
  const counts = new Map<string, number>()
  for (const investment of sorted) {
    const id = key(quarterOf(investment.investmentDate))
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const first = quarterOf(sorted[0].investmentDate)
  const last = quarterOf(sorted[sorted.length - 1].investmentDate)

  const points: TimePoint[] = []
  let { year, quarter } = first
  while (year < last.year || (year === last.year && quarter <= last.quarter)) {
    const id = key({ year, quarter })
    points.push({
      period: id,
      label: `Q${quarter} ${String(year).slice(2)}`,
      value: counts.get(id) ?? 0,
    })
    quarter += 1
    if (quarter > 4) {
      quarter = 1
      year += 1
    }
  }
  return points
}

/** How many cheques were written each month — the pace, independent of size. */
export function dealsPerMonth(investments: InvestmentDTO[]): TimePoint[] {
  if (investments.length === 0) return []

  const sorted = [...investments].sort((a, b) => a.investmentDate.localeCompare(b.investmentDate))
  const counts = new Map<string, number>()
  for (const investment of sorted) {
    const key = monthKey(investment.investmentDate)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const first = monthKey(sorted[0].investmentDate)
  const last = monthKey(sorted[sorted.length - 1].investmentDate)

  return monthsBetween(first, last).map((period) => ({
    period,
    label: monthLabel(period),
    value: counts.get(period) ?? 0,
  }))
}

/**
 * Capital by sector, largest first, in one currency.
 *
 * Only active and exited positions count; a write-off is money that is gone, and
 * showing it as sector exposure would overstate the book.
 */
export function sectorExposure(investments: InvestmentDTO[], currency: string): CategoryPoint[] {
  const relevant = investments.filter(
    (investment) =>
      investment.currency === currency && investment.status !== InvestmentStatus.WRITTEN_OFF
  )

  const totals = new Map<string, number>()
  for (const investment of relevant) {
    const sector = investment.startupSector?.trim() || 'Unspecified'
    totals.set(sector, (totals.get(sector) ?? 0) + investment.amount)
  }

  const sum = [...totals.values()].reduce((a, b) => a + b, 0)
  if (sum === 0) return []

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value, share: value / sum }))
    .sort((a, b) => b.value - a.value)
}

/**
 * The last `count` points of a series, as bare numbers for a sparkline.
 * Returns an empty array when there's too little history to show a shape.
 */
export function sparkValues(series: TimePoint[], count = 12): number[] {
  if (series.length < 2) return []
  return series.slice(-count).map((point) => point.value)
}
