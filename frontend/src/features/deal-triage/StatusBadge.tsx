import { Badge } from '@/components/ui/Badge'
import { OpportunityStatus, RecommendedAction, actionLabels, statusLabels } from './types'

const statusVariants: Record<OpportunityStatus, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  [OpportunityStatus.SCORING]: 'secondary',
  [OpportunityStatus.PENDING_REVIEW]: 'warning',
  [OpportunityStatus.APPROVED]: 'success',
  [OpportunityStatus.REJECTED]: 'danger',
  [OpportunityStatus.NEEDS_MORE_INFO]: 'default',
}

export const StatusBadge = ({ status }: { status: OpportunityStatus }) => (
  <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
)

const actionVariants: Record<RecommendedAction, 'success' | 'danger' | 'default'> = {
  [RecommendedAction.PURSUE]: 'success',
  [RecommendedAction.PASS]: 'danger',
  [RecommendedAction.NEEDS_MORE_INFO]: 'default',
}

export const ActionBadge = ({ action }: { action: RecommendedAction }) => (
  <Badge variant={actionVariants[action]}>{actionLabels[action]}</Badge>
)
