import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { startupApi, startupKeys } from '@/features/startup/api'
import type { StartupDTO } from '@/features/startup/types'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
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

  const query = useQuery({
    queryKey: startupKeys.search({ search }),
    queryFn: () => startupApi.search({ search }),
    enabled: search.trim().length > 1,
  })

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded border border-gray-300 bg-white px-3 py-2">
        <Avatar name={value.name} logoUrl={value.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{value.name}</p>
          <p className="text-xs text-gray-500">
            {value.sector} · {stageLabel(value.stage)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setSearch('')
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  const results = query.data ?? []

  return (
    <div>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
      />

      {search.trim().length > 1 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded border border-gray-200">
          {query.isLoading ? (
            <p className="px-3 py-3 text-sm text-gray-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">No startups match that.</p>
          ) : (
            results.map((startup) => (
              <button
                key={startup.id}
                type="button"
                onClick={() => onChange(startup)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50'
                )}
              >
                <Avatar name={startup.name} logoUrl={startup.logoUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{startup.name}</p>
                  <p className="text-xs text-gray-500">
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
