import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { authApi } from '@/features/auth/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/Loading'

export const LandingPage = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [isTestMode, setIsTestMode] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (isLoading) {
    return <Loading />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = isRegister
        ? await authApi.register(email, password)
        : await authApi.login(email, password)

      setEmail('')
      setPassword('')

      if (response.accountSetupComplete) {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/account-type-selection'
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Connect VCs and Startups</p>
        </div>

        {!isTestMode && (
          <div className="space-y-4">
            <Button
              onClick={() => authApi.loginWithGoogle()}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Sign in with Google
            </Button>

            <Button
              onClick={() => authApi.loginWithLinkedin()}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Sign in with LinkedIn
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <Button
              onClick={() => setIsTestMode(true)}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Test Login (dev only)
            </Button>

            <p className="text-center text-sm text-gray-500 mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        )}

        {isTestMode && (
          <form onSubmit={handleTestSubmit} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>DEV ONLY:</strong> This email/password login is for testing purposes only. Use Google or LinkedIn for production.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Loading...' : isRegister ? 'Register' : 'Login'}
            </Button>

            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700"
              disabled={isSubmitting}
            >
              {isRegister ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setIsTestMode(false)
                setError('')
                setEmail('')
                setPassword('')
              }}
              disabled={isSubmitting}
            >
              Back to OAuth
            </Button>

            <p className="text-center text-xs text-gray-500 mt-4">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
