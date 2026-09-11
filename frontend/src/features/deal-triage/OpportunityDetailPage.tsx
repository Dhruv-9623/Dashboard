import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { opportunityApi, opportunityKeys } from './api'
import { OpportunityStatus, RecommendedAction } from './types'
import type { OpportunityDTO } from './types'
import { StatusBadge, ActionBadge } from './StatusBadge'
import { conflictApi, conflictKeys } from '@/features/conflict-sentinel/api'
import { ConflictReportView } from '@/features/conflict-sentinel/ConflictReportView'
import { PageHeader } from '@/components/PageHeader'
import { ScoreDial, scoreBand } from '@/components/ScoreDial'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { CheckIcon, SparkIcon, ShieldIcon, XIcon } from '@/components/icons'
import { formatDateTime, formatMoney, stageLabel } from '@/lib/constants'

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2.5">
    <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
    <dd className="text-right text-sm font-medium text-gray-900">{value}</dd>
  </div>
)

const decided = (status: OpportunityStatus) =>
  status === OpportunityStatus.APPROVED || status === OpportunityStatus.REJECTED

export const OpportunityDetailPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const query = useQuery({
    queryKey: opportunityKeys.detail(id),
    queryFn: () => opportunityApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.status === OpportunityStatus.SCORING ? 3000 : false,
  })

  const conflict = useQuery({
    queryKey: conflictKeys.forOpportunity(id),
    queryFn: () => conflictApi.getForOpportunity(id),
    enabled: Boolean(id),
  })

  const invalidate = (deal: OpportunityDTO) => {
    queryClient.setQueryData(opportunityKeys.detail(id), deal)
    queryClient.invalidateQueries({ queryKey: opportunityKeys.all })
  }

  const decide = useMutation({
    mutationFn: (status: OpportunityStatus) =>
      opportunityApi.decide(id, { status, decisionNote: note.trim() || undefined }),
    onSuccess: invalidate,
  })

  const rescore = useMutation({
    mutationFn: () => opportunityApi.rescore(id),
    onSuccess: invalidate,
  })

  const runConflict = useMutation({
    mutationFn: () => conflictApi.run(id),
    onSuccess: (report) => queryClient.setQueryData(conflictKeys.forOpportunity(id), report),
  })

  if (query.isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (query.isError || !query.data) {
    return <ErrorState error={query.error ?? new Error('Not found')} onRetry={() => query.refetch()} />
  }

  const deal = query.data
  const scoring = deal.status === OpportunityStatus.SCORING
  const band = deal.fitScore !== null ? scoreBand(deal.fitScore) : null

  return (
    <>
      <PageHeader
        title={deal.companyName}
        description={`${deal.sector} · ${stageLabel(deal.stage)} · ${formatMoney(deal.askAmount, deal.currency)}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/deal-triage')}>
            Back to queue
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,300px)]">
        <div className="space-y-5">
          <Card>
            <CardContent className="py-4">
              <dl className="divide-y divide-gray-100">
                <Field label="Status" value={<StatusBadge status={deal.status} />} />
                <Field label="Sector" value={deal.sector} />
                <Field label="Stage" value={stageLabel(deal.stage)} />
                <Field label="Ask" value={formatMoney(deal.askAmount, deal.currency)} />
                <Field
                  label="Website"
                  value={
                    deal.website ? (
                      <a
                        href={deal.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-blue-600 hover:underline"
                      >
                        Visit
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <Field label="Contact" value={deal.contactEmail ?? '—'} />
                <Field label="Logged" value={formatDateTime(deal.createdAt)} />
                <Field label="Scored" value={formatDateTime(deal.scoredAt)} />
              </dl>
            </CardContent>
          </Card>

          {deal.description && (
            <Card>
              <CardContent className="py-4">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </h2>
                <p className="text-sm leading-relaxed text-gray-700">{deal.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-start gap-5">
                <ScoreDial score={deal.fitScore} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900">Thesis fit</h2>
                    {band && <span className={`text-sm font-medium ${band.tone}`}>{band.label}</span>}
                    {deal.recommendedAction && <ActionBadge action={deal.recommendedAction} />}
                  </div>

                  {scoring ? (
                    <p className="mt-2 text-sm text-gray-500">
                      The scoring agent is running. This refreshes automatically.
                    </p>
                  ) : deal.rationale ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">{deal.rationale}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      No score yet. Check that a thesis is defined, then re-score.
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-3"
                    onClick={() => rescore.mutate()}
                    disabled={rescore.isPending || scoring}
                  >
                    <SparkIcon className="mr-2 h-4 w-4" />
                    {rescore.isPending ? 'Re-scoring…' : 'Re-score'}
                  </Button>
                </div>
              </div>

              {deal.citations.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Why this score
                  </h3>
                  {deal.citations.map((citation, index) => (
                    <div
                      key={index}
                      className={`rounded-lg border p-3 ${
                        citation.supporting
                          ? 'border-green-200 bg-green-50'
                          : 'border-amber-200 bg-amber-50'
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          citation.supporting ? 'text-green-800' : 'text-amber-800'
                        }`}
                      >
                        {citation.supporting ? 'Supports' : 'Counts against'} · {citation.thesisField}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">{citation.claim}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Conflict Sentinel</h2>
                  <p className="text-xs text-gray-500">
                    Overlap against your holdings, checked on demand.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runConflict.mutate()}
                  disabled={runConflict.isPending}
                >
                  <ShieldIcon className="mr-2 h-4 w-4" />
                  {runConflict.isPending
                    ? 'Checking…'
                    : conflict.data
                      ? 'Re-run check'
                      : 'Run check'}
                </Button>
              </div>

              {runConflict.isError && (
                <Alert variant="danger">{errorMessage(runConflict.error)}</Alert>
              )}

              {conflict.data ? (
                <ConflictReportView report={conflict.data} />
              ) : (
                !runConflict.isPending && (
                  <p className="text-sm text-gray-500">
                    No conflict check has been run for this opportunity yet.
                  </p>
                )
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="py-5">
              <h2 className="text-sm font-semibold text-gray-900">Decision</h2>

              {decided(deal.status) ? (
                <div className="mt-3">
                  <StatusBadge status={deal.status} />
                  {deal.decisionNote && (
                    <p className="mt-3 text-sm text-gray-700">{deal.decisionNote}</p>
                  )}
                  <p className="mt-3 text-xs text-gray-500">
                    Recorded {formatDateTime(deal.updatedAt)}. Decisions are written to the audit log.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-xs text-gray-500">
                    Your call overrides the recommendation. Both are kept.
                  </p>

                  <div className="mt-4">
                    <Label htmlFor="decision-note">Note (optional)</Label>
                    <Textarea
                      id="decision-note"
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Why you're taking this call."
                    />
                  </div>

                  {decide.isError && (
                    <Alert variant="danger" className="mt-3">
                      {errorMessage(decide.error)}
                    </Alert>
                  )}

                  <div className="mt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => decide.mutate(OpportunityStatus.APPROVED)}
                      disabled={decide.isPending || scoring}
                    >
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => decide.mutate(OpportunityStatus.REJECTED)}
                      disabled={decide.isPending || scoring}
                    >
                      <XIcon className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => decide.mutate(OpportunityStatus.NEEDS_MORE_INFO)}
                      disabled={decide.isPending || scoring}
                    >
                      Needs more info
                    </Button>
                  </div>

                  {deal.recommendedAction === RecommendedAction.NEEDS_MORE_INFO && (
                    <p className="mt-3 text-xs text-gray-500">
                      The agent flagged this as incomplete — adding a description and re-scoring
                      usually resolves it.
                    </p>
                  )}
                </>
              )}

              <Link
                to="/deal-triage"
                className="mt-5 block text-center text-sm text-blue-600 hover:underline"
              >
                Back to queue
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
