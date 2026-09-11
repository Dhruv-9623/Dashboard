import { confidenceBand, dimensionDescriptions, dimensionLabels } from './types'
import type { ConflictReportDTO } from './types'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { ShieldIcon } from '@/components/icons'
import { formatDateTime } from '@/lib/constants'

const percent = (confidence: number) => Math.round(confidence * 100)

export const ConflictReportView = ({ report }: { report: ConflictReportDTO }) => {
  const overall = confidenceBand(report.overallConfidence)

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <ShieldIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Overall conflict confidence</p>
              <p className="text-xs text-gray-500">
                Compared against {report.comparedCompanyCount} portfolio{' '}
                {report.comparedCompanyCount === 1 ? 'company' : 'companies'} ·{' '}
                {formatDateTime(report.generatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums text-gray-900">
              {percent(report.overallConfidence)}%
            </span>
            <Badge variant={overall.variant}>{overall.label}</Badge>
          </div>
        </div>
        <Progress className="mt-4" value={percent(report.overallConfidence)} tone={overall.tone} />
      </div>

      <div className="space-y-3">
        {report.dimensions.map((dimension) => {
          const band = confidenceBand(dimension.confidence)

          return (
            <div
              key={dimension.dimension}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {dimensionLabels[dimension.dimension]}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-gray-700">
                    {percent(dimension.confidence)}%
                  </span>
                  <Badge variant={band.variant}>{band.label}</Badge>
                </div>
              </div>

              <Progress className="mt-3" value={percent(dimension.confidence)} tone={band.tone} />

              <p className="mt-3 text-sm text-gray-700">{dimension.summary}</p>
              <p className="mt-1 text-xs text-gray-500">
                {dimensionDescriptions[dimension.dimension]}
              </p>

              {dimension.matches.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                  {dimension.matches.map((match) => (
                    <li key={`${dimension.dimension}-${match.portfolioCompanyId}`} className="text-sm">
                      <span className="font-medium text-gray-900">
                        {match.portfolioCompanyName}
                      </span>
                      <span className="text-gray-600"> — {match.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
