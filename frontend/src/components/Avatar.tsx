import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const Avatar = ({ name, logoUrl, size = 'md', className }: AvatarProps) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn('shrink-0 rounded-lg object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg bg-gray-100 font-semibold text-gray-600',
        sizes[size],
        className
      )}
    >
      {initials(name)}
    </div>
  )
}
