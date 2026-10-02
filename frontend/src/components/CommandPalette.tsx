import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { AiMark } from '@/components/ai/AiOrb'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { navFor } from '@/components/layout/navigation'
import { startupApi, startupKeys } from '@/features/startup/api'
import { vcFirmApi } from '@/features/vc-firm/api'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { PlusIcon, SparkIcon } from '@/components/icons'

/**
 * ⌘K: the one keyboard path to everywhere.
 *
 * Three tiers, in the order a user thinks:
 *   1. **Actions** — the handful of things you came to do (record an investment,
 *      open a round).
 *   2. **Companies and firms** — searched live against the API, debounced, so
 *      the palette doubles as the fastest way to open a profile.
 *   3. **Navigation** — every page, so nothing in the product is more than two
 *      keystrokes away.
 */
export function useCommandPalette() {
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K / Ctrl-K, and "/" when the user isn't already typing somewhere.
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true

      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const open = useCallback(() => setOpen(true), [])
  return { isOpen, setOpen, open }
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query, 220)
  const isStartup = user?.userType === UserType.STARTUP

  const groups = useMemo(() => navFor(user?.userType), [user?.userType])

  // Only search once there's something to search for — an empty palette should
  // not fire a request every time it opens.
  const enabled = open && search.trim().length >= 2

  const startups = useQuery({
    queryKey: startupKeys.search({ search, size: 5 }),
    queryFn: () => startupApi.search({ search, size: 5 }),
    enabled: enabled && !isStartup,
  })

  const firms = useQuery({
    queryKey: ['vc-firms', 'search', search],
    queryFn: () => vcFirmApi.searchFirms(search),
    enabled: enabled && isStartup,
  })

  const go = (to: string) => {
    onOpenChange(false)
    setQuery('')
    navigate(to)
  }

  const actions = isStartup
    ? [
        { label: 'Open a funding round', to: '/funding', Icon: PlusIcon },
        { label: 'Find investors', to: '/discover', Icon: SparkIcon },
      ]
    : [
        { label: 'Record an investment', to: '/investments?new=1', Icon: PlusIcon },
        { label: 'Add a company to the pool', to: '/pool?new=1', Icon: PlusIcon },
        { label: 'New opportunity', to: '/deal-triage/new', Icon: PlusIcon },
      ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search companies, jump to a page, or start an action"
    >
      <CommandInput
        placeholder="Search companies, pages and actions…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="scrollbar-slim">
        <CommandEmpty>
          {enabled ? 'Nothing matched. Try a company name.' : 'Type to search.'}
        </CommandEmpty>

        <CommandGroup heading="Actions">
          {actions.map(({ label, to, Icon }) => (
            <CommandItem key={to + label} value={label} onSelect={() => go(to)}>
              <Icon className="size-4 text-ink-muted" aria-hidden="true" />
              {label}
            </CommandItem>
          ))}
          <CommandItem value="AI suggestions matches" onSelect={() => go('/suggestions')}>
            <AiMark />
            Review AI matches
          </CommandItem>
        </CommandGroup>

        {!isStartup && (startups.data?.items?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Companies">
              {startups.data?.items.map((startup) => (
                <CommandItem
                  key={startup.id}
                  value={startup.name}
                  onSelect={() => go(`/startups/${startup.id}`)}
                >
                  <EntityAvatar name={startup.name} logoUrl={startup.logoUrl} size="sm" />
                  <span className="flex-1 truncate">{startup.name}</span>
                  {startup.sector && (
                    <Badge variant="secondary" className="ml-auto">
                      {startup.sector}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {isStartup && (firms.data?.length ?? 0) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Investors">
              {firms.data?.map((firm) => (
                <CommandItem
                  key={firm.id}
                  value={firm.name}
                  onSelect={() => go(`/firms/${firm.id}`)}
                >
                  <EntityAvatar name={firm.name} size="sm" />
                  <span className="flex-1 truncate">{firm.name}</span>
                  {firm.location && (
                    <span className="ml-auto text-xs text-ink-muted">{firm.location}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map(({ to, label, Icon }) => (
              <CommandItem key={to} value={`${group.label} ${label}`} onSelect={() => go(to)}>
                <Icon className="size-4 text-ink-muted" aria-hidden="true" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
