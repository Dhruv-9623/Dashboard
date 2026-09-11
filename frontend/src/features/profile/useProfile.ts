import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { vcFirmApi } from '@/features/vc-firm/api'
import { startupApi } from '@/features/startup/api'
import type { VCFirmDTO } from '@/features/vc-firm/types'
import type { StartupDTO } from '@/features/startup/types'

export const profileKeys = {
  mine: ['profile', 'me'] as const,
}

/**
 * Resolves the entity the signed-in user belongs to — a VC firm or a startup —
 * so shared chrome and guards can stay user-type agnostic.
 */
export const useProfile = () => {
  const { user } = useAuth()
  const isStartup = user?.userType === UserType.STARTUP

  const query = useQuery<VCFirmDTO | StartupDTO | null>({
    queryKey: [...profileKeys.mine, user?.userType ?? 'none'],
    queryFn: () => (isStartup ? startupApi.getMine() : vcFirmApi.getMyFirm()),
    enabled: Boolean(user?.userType),
    staleTime: 1000 * 60,
  })

  const entity = query.data ?? null
  const startup = isStartup ? (entity as StartupDTO | null) : null
  const firm = isStartup ? null : (entity as VCFirmDTO | null)

  return {
    isStartup,
    entity,
    firm,
    startup,
    entityId: entity?.id ?? null,
    displayName: entity?.name ?? (isStartup ? 'Your startup' : 'Your firm'),
    logoUrl: startup?.logoUrl ?? null,
    subtitle: startup
      ? `${startup.sector} · ${startup.stage}`
      : firm?.location ?? '',
    needsSetup: Boolean(user?.userType) && !query.isLoading && !query.isError && !entity,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
