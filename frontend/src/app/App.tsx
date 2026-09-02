import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { LandingPage } from '@/routes/LandingPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { AccountTypeSelectionPage } from '@/features/auth/AccountTypeSelectionPage'
import { DashboardPage } from '@/features/vc-firm/DashboardPage'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/account-type-selection" element={<AccountTypeSelectionPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
