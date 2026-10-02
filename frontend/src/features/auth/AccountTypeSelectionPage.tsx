import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from './api'
import { UserType } from './types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { errorMessage } from '@/components/ErrorState'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export const AccountTypeSelectionPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<UserType | null>(null)
  useDocumentTitle('Choose account type')

  const mutation = useMutation({
    mutationFn: (userType: UserType) => authApi.completeAccountTypeSelection(userType),
    onSuccess: (user) => {
      // useAuth caches /me forever; without this the guards still see userType=null and
      // bounce straight back to this page.
      queryClient.setQueryData(['auth', 'me'], user)
      navigate('/dashboard')
    },
  })

  const handleSelect = (type: UserType) => {
    setSelectedType(type)
    mutation.mutate(type)
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-surface-sunken px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Account Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-ink-secondary mb-6">
            Are you a Venture Capitalist or a Startup?
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleSelect(UserType.VC)}
              disabled={mutation.isPending}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === UserType.VC
                  ? 'border-brand bg-brand-subtle'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <h3 className="font-semibold text-ink">Venture Capitalist</h3>
              <p className="text-sm text-ink-secondary">I invest in startups</p>
            </button>

            <button
              onClick={() => handleSelect(UserType.STARTUP)}
              disabled={mutation.isPending}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === UserType.STARTUP
                  ? 'border-brand bg-brand-subtle'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <h3 className="font-semibold text-ink">Startup Founder</h3>
              <p className="text-sm text-ink-secondary">I'm building a company</p>
            </button>
          </div>

          {mutation.isPending && (
            <p className="text-center text-sm text-ink-secondary mt-4">Loading...</p>
          )}

          {mutation.isError && (
            <p role="alert" className="text-center text-sm text-negative mt-4">
              {errorMessage(mutation.error, 'An error occurred. Please try again.')}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
