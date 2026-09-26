import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useEntrance } from '@/lib/useMotion'
import { InvestmentStatus, investmentStatusLabels, roundLabels } from '@/features/investments/types'
import type { InvestmentDTO } from '@/features/investments/types'
import { formatDate, formatMoney, stageLabel } from '@/lib/constants'

interface CompanyBreakdownProps {
  investments: InvestmentDTO[]
  currency: string
  /** Rows shown before "Show all". */
  limit?: number
  className?: string
}

const statusVariants: Record<InvestmentStatus, 'success' | 'secondary' | 'danger'> = {
  [InvestmentStatus.ACTIVE]: 'success',
  [InvestmentStatus.EXITED]: 'secondary',
  [InvestmentStatus.WRITTEN_OFF]: 'danger',
}

/**
 * Every position, one row each, ranked by how much of the book it is.
 *
 * The other charts on this page aggregate — by sector, by month, by stage — and
 * aggregation is exactly what hides the thing a partner asks first: *which
 * company is that*. This is the per-company answer, with the share of the
 * portfolio each one represents, which no other view states.
 *
 * It is deliberately a ranked list rather than a chart. At ten positions a chart
 * would be prettier; at a hundred it would be unreadable, while a sorted list
 * with a share bar stays useful — you read the top, and the tail collapses
 * behind "Show all". Positions in the same company are merged, because a
 * follow-on is more capital in one name, not a second name.
 */
export const CompanyBreakdown = ({
  investments,
  currency,
  limit = 8,
  className,
}: CompanyBreakdownProps) => {
  const [expanded, setExpanded] = useState(false)

  const companies = useMemo(() => {
    const merged = new Map<
      string,
      {
        id: string
        name: string
        sector: string | null
        logoUrl: string | null
        amount: number
        deals: number
        latest: string
        rounds: string[]
        equity: number | null
        status: InvestmentStatus
      }
    >()

    for (const item of investments) {
      if (item.currency !== currency) continue
      const existing = merged.get(item.startupId)
      if (existing) {
        existing.amount += item.amount
        existing.deals += 1
        existing.equity =
          item.equityPercentage !== null
            ? Math.max(existing.equity ?? 0, item.equityPercentage)
            : existing.equity
        if (item.investmentDate > existing.latest) {
          existing.latest = item.investmentDate
          // The most recent round is the one that describes where the company is.
          existing.status = item.status
        }
        if (!existing.rounds.includes(item.round)) existing.rounds.push(item.round)
      } else {
        merged.set(item.startupId, {
          id: item.startupId,
          name: item.startupName,
          sector: item.startupSector,
          logoUrl: item.startupLogoUrl,
          amount: item.amount,
          deals: 1,
          latest: item.investmentDate,
          rounds: [item.round],
          equity: item.equityPercentage,
          status: item.status,
        })
      }
    }

    const rows = [...merged.values()].sort((a, b) => b.amount - a.amount)
    const total = rows.reduce((sum, row) => sum + row.amount, 0)
    return rows.map((row) => ({ ...row, share: total > 0 ? row.amount / total : 0 }))
  }, [investments, currency])

  const visible = expanded ? companies : companies.slice(0, limit)
  const listRef = useEntrance<HTMLUListElement>(`${visible.length}-${expanded}`)

  if (companies.length === 0) return null

  return (
    <div className={className}>
      <ul ref={listRef} className="divide-y divide-line">
        {visible.map((company) => (
          <li key={company.id} className="group/company py-3 first:pt-0">
            <div className="flex items-center gap-3">
              <EntityAvatar name={company.name} logoUrl={company.logoUrl} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/startups/${company.id}`}
                    className="truncate text-[13px] font-medium text-ink hover:text-brand-ink hover:underline"
                  >
                    {company.name}
                  </Link>
                  {company.deals > 1 && (
                    <Badge variant="secondary">{company.deals} rounds</Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {[
                    company.sector,
                    company.rounds.map((round) => roundLabels[round as keyof typeof roundLabels] ?? stageLabel(round)).join(' → '),
                    `last ${formatDate(company.latest)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <div className="hidden w-24 shrink-0 text-right sm:block">
                <p className="text-[13px] font-medium tabular text-ink">
                  {formatMoney(company.amount, currency)}
                </p>
                <p className="text-xs tabular text-ink-muted">
                  {company.equity !== null ? `${company.equity.toFixed(2)}% equity` : '—'}
                </p>
              </div>

              <Badge variant={statusVariants[company.status]} dot className="hidden shrink-0 md:inline-flex">
                {investmentStatusLabels[company.status]}
              </Badge>
            </div>

            {/* Share of the book — the figure this view exists to show. */}
            <div className="mt-2 flex items-center gap-2 pl-11">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-viz-1 transition-[width] duration-500"
                  style={{ width: `${Math.max(company.share * 100, 1.5)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular text-ink-muted">
                {Math.round(company.share * 100)}%
              </span>
              <span className="text-[13px] font-medium tabular text-ink sm:hidden">
                {formatMoney(company.amount, currency)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {companies.length > limit && (
        <div className={cn('pt-3', visible.length > 0 && 'border-t border-line')}>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((open) => !open)}>
            {expanded
              ? 'Show top 8'
              : `Show all ${companies.length} companies`}
          </Button>
        </div>
      )}
    </div>
  )
}
