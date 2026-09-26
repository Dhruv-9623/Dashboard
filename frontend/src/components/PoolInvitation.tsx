import type { ReactNode } from 'react'
import { MeetingScene } from '@/components/illustrations/MeetingScene'
import { cn } from '@/lib/utils'

interface PoolInvitationProps {
  title: string
  description: string
  action?: ReactNode
  className?: string
}

/**
 * The panel that fills the space under a short list.
 *
 * A pool with four companies in it leaves most of the page empty, and empty
 * space on a working screen reads as "this product has nothing in it" rather
 * than "you have room". This turns that area into the scene the whole product
 * is about — an investor and a founder finding each other — with the action that
 * adds the next company.
 *
 * It is shown only while the list is short. Once the table fills the page this
 * would be in the way, so the caller stops rendering it.
 */
export const PoolInvitation = ({ title, description, action, className }: PoolInvitationProps) => (
  <section
    className={cn(
      'relative overflow-hidden rounded-xl border border-line bg-surface shadow-card',
      className
    )}
  >
    {/* A brand field behind the scene, so the panel has some weight of its own. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(620px circle at 78% 120%, color-mix(in oklab, var(--brand) 10%, transparent), transparent 65%)',
      }}
    />

    <div className="relative flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between sm:px-8">
      <div className="max-w-sm text-center sm:text-left">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">{description}</p>
        {action && <div className="mt-4 flex justify-center sm:justify-start">{action}</div>}
      </div>

      <MeetingScene className="w-full max-w-[300px] shrink-0" />
    </div>
  </section>
)
