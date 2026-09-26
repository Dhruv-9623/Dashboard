import { cn } from '@/lib/utils'
import { safeUrl } from '@/lib/utils'

interface EntityAvatarProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'size-6 text-[10px] rounded-md',
  md: 'size-8 text-xs rounded-lg',
  lg: 'size-11 text-sm rounded-xl',
} as const

/** Two initials for a company: "Nimbus Grid" → NG, "Ledgerly" → LE. */
const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * A stable colour per name, so the same company is always the same colour and a
 * long table gains a second, pre-attentive way to find a row.
 *
 * Picked from the viz palette, which is already contrast-checked, rather than
 * hashing to an arbitrary hue that might land on unreadable.
 */
const tint = (name: string) => {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997
  }
  return (hash % 6) + 1
}

/**
 * A company's mark: its logo when there is one, otherwise a tinted monogram.
 * Every row in every table of companies gets one — it's the cheapest way to make
 * a dense list scannable (Attio, Apollo, Twenty all do this).
 */
export const EntityAvatar = ({ name, logoUrl, size = 'md', className }: EntityAvatarProps) => {
  const href = safeUrl(logoUrl)
  const index = tint(name)

  if (href) {
    return (
      <img
        src={href}
        alt=""
        className={cn('shrink-0 border border-line object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold',
        'border border-[color-mix(in_oklab,var(--tint)_28%,transparent)]',
        'bg-[color-mix(in_oklab,var(--tint)_12%,var(--surface))]',
        'text-[color-mix(in_oklab,var(--tint)_75%,var(--ink))]',
        sizes[size],
        className
      )}
      style={{ ['--tint' as string]: `var(--viz-${index})` }}
    >
      {initials(name)}
    </span>
  )
}
