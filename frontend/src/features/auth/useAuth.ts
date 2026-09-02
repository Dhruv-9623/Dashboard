import { useQuery } from '@tanstack/react-query'
import { authApi } from './api'
import { UserDTO } from './types'

export const useAuth = () => {
  const query = useQuery<UserDTO | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await authApi.getCurrentUser()
      } catch (error) {
        return null
      }
    },
    staleTime: Infinity,
  })

  return {
    user: query.data || null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    refetch: query.refetch,
  }
}
