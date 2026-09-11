import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { useProfile } from '@/features/profile/useProfile'
import { Loading } from '@/components/Loading'
import { ErrorState } from '@/components/ErrorState'

const setupPathFor = (userType: UserType | null | undefined) =>
  userType === UserType.STARTUP ? '/onboarding/startup' : '/onboarding/firm'

/** Main app: a user without a firm or startup is sent to create one first. */
export const RequireEntity = () => {
  const { user } = useAuth()
  const { needsSetup, isLoading, error, refetch } = useProfile()

  if (!user?.userType) return <Navigate to="/account-type-selection" replace />
  if (isLoading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (needsSetup) return <Navigate to={setupPathFor(user.userType)} replace />

  return <Outlet />
}

/** Setup screens: keep out users who already have an entity. */
export const RequireNoEntity = () => {
  const { user } = useAuth()
  const { needsSetup, isLoading, error, refetch } = useProfile()

  if (!user?.userType) return <Navigate to="/account-type-selection" replace />
  if (isLoading) return <Loading />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!needsSetup) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
