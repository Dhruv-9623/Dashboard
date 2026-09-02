import { fetchApi, API_BASE } from '@/lib/api-client'
import { UserDTO, UserType } from './types'

export const authApi = {
  getCurrentUser: () =>
    fetchApi<UserDTO>('/api/auth/me'),

  completeAccountTypeSelection: (userType: UserType) =>
    fetchApi<UserDTO>('/api/auth/account-type', {
      method: 'POST',
      body: JSON.stringify({ userType }),
    }),

  register: (email: string, password: string) =>
    fetchApi<UserDTO>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    fetchApi<UserDTO>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginWithGoogle: () => {
    window.location.href = `${API_BASE}/oauth2/authorization/google`
  },

  loginWithLinkedin: () => {
    window.location.href = `${API_BASE}/oauth2/authorization/linkedin`
  },
}
