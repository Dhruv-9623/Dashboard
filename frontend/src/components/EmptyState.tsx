import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center',
      className
    )}
  >
    {icon && (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    {description && <p className="mt-1.5 max-w-md text-sm text-gray-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)
