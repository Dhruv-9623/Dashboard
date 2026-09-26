import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  /** A second, quieter action — "learn more", "import instead". */
  secondaryAction?: React.ReactNode
  className?: string
}

/**
 * The state a list is in before anyone has used it — which, for a new account,
 * is the majority of the product.
 *
 * It gets real design rather than a line of grey text: a soft brand field, a
 * ghosted preview of the rows that will appear here, and the action that fills
 * it. The preview is the part that does the work — it shows the shape of what
 * belongs here, so the empty screen teaches instead of apologising.
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-xl border border-line bg-surface px-6 py-12 text-center',
      className
    )}
  >
    {/* A wash behind the mark, so the panel reads as a designed surface rather
        than a disabled one. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
      style={{
        background:
          'radial-gradient(420px circle at 50% -40%, color-mix(in oklab, var(--brand) 14%, transparent), transparent 70%)',
      }}
    />

    <div className="relative">
      {icon && (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-brand-line bg-brand-subtle text-brand">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-secondary">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>

    {/* Ghost rows below the message, fading into the card's bottom edge: the
        shape of what belongs here, so the empty screen teaches rather than
        apologises. Never behind the text, where it would read as a glitch. */}
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto mt-8 -mb-12 max-w-lg space-y-2"
      style={{
        maskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
      }}
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-3 rounded-lg border border-line bg-surface-sunken/70 p-3"
        >
          <span className="size-7 shrink-0 rounded-md bg-line" />
          <span className="h-2.5 flex-1 rounded-full bg-line" />
          <span className="h-2.5 w-14 rounded-full bg-line" />
        </div>
      ))}
    </div>
  </div>
)
