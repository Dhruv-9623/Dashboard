import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from './api'
import { UserType } from './types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export const AccountTypeSelectionPage = () => {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<UserType | null>(null)

  const mutation = useMutation({
    mutationFn: (userType: UserType) => authApi.completeAccountTypeSelection(userType),
    onSuccess: () => {
      navigate('/dashboard')
    },
  })

  const handleSelect = (type: UserType) => {
    setSelectedType(type)
    mutation.mutate(type)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Account Type</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-6">
            Are you a Venture Capitalist or a Startup?
          </p>

          <div className="space-y-4">
            <button
              onClick={() => handleSelect(UserType.VC)}
              disabled={mutation.isPending}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === UserType.VC
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-900">Venture Capitalist</h3>
              <p className="text-sm text-gray-600">I invest in startups</p>
            </button>

            <button
              onClick={() => handleSelect(UserType.STARTUP)}
              disabled={mutation.isPending}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedType === UserType.STARTUP
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-semibold text-gray-900">Startup Founder</h3>
              <p className="text-sm text-gray-600">I'm building a company</p>
            </button>
          </div>

          {mutation.isPending && (
            <p className="text-center text-sm text-gray-600 mt-4">Loading...</p>
          )}

          {mutation.isError && (
            <p className="text-center text-sm text-red-600 mt-4">
              An error occurred. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
