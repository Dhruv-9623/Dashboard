import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startupApi, startupKeys } from '@/features/startup/api'
import type { StartupDTO } from '@/features/startup/types'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { stageLabel } from '@/lib/constants'

interface StartupPickerProps {
  value: StartupDTO | null
  onChange: (startup: StartupDTO | null) => void
  placeholder?: string
}

export const StartupPicker = ({
  value,
  onChange,
  placeholder = 'Search startups…',
}: StartupPickerProps) => {
  const [search, setSearch] = useState('')
  // Debounced: one request after typing stops, not one per keystroke.
  const debouncedSearch = useDebouncedValue(search.trim())
  const params = { search: debouncedSearch, size: 8 }

  const query = useQuery({
    queryKey: startupKeys.search(params),
    queryFn: () => startupApi.search(params),
    enabled: debouncedSearch.length > 1,
  })

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded border border-line-strong bg-surface px-3 py-2">
        <Avatar name={value.name} logoUrl={value.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{value.name}</p>
          <p className="text-xs text-ink-muted">
            {value.sector} · {stageLabel(value.stage)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setSearch('')
          }}
          className="text-sm text-brand-ink hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  const results = query.data?.items ?? []

  return (
    <div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
      />

      {search.trim().length > 1 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded border border-line">
          {query.isLoading || search.trim() !== debouncedSearch ? (
            <p className="px-3 py-3 text-sm text-ink-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-muted">No startups match that.</p>
          ) : (
            results.map((startup) => (
              <button
                key={startup.id}
                type="button"
                onClick={() => onChange(startup)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-sunken'
                )}
              >
                <Avatar name={startup.name} logoUrl={startup.logoUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{startup.name}</p>
                  <p className="text-xs text-ink-muted">
                    {startup.sector} · {stageLabel(startup.stage)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
