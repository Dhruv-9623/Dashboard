import { useAuth } from '@/features/auth/useAuth'
import { CreateFirmPage } from './CreateFirmPage'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/Button'

export const DashboardPage = () => {
  const { user } = useAuth()

  // This would normally come from a getUserFirm endpoint
  // For now, we'll check if user belongs to a firm via a list endpoint
  // Since the backend doesn't expose this directly, we'll assume a firm exists
  // and needs to be fetched via a separate endpoint

  if (!user) {
    return <Loading />
  }

  // For this phase, we'll show the create firm form as a placeholder
  // In a real implementation, we'd check if the user already belongs to a firm

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              // Logout - the backend session will be cleared
              window.location.href = '/api/auth/logout'
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* For this phase, show create firm */}
        <CreateFirmPage onFirmCreated={() => {
          // Refresh user data to show updated firm info
          window.location.reload()
        }} />
      </div>
    </div>
  )
}
