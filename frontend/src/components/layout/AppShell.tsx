import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { authApi } from '@/features/auth/api'
import { UserType } from '@/features/auth/types'
import { useProfile } from '@/features/profile/useProfile'
import { navFor } from './navigation'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/Badge'
import { LogOutIcon, SettingsIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  )

export const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { displayName, logoUrl, subtitle } = useProfile()
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  const groups = navFor(user?.userType)

  const sidebar = (
    <>
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
        <Avatar name={displayName} logoUrl={logoUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
          <Badge variant="secondary" className="mt-0.5">
            {user?.userType === UserType.STARTUP ? 'Startup' : 'VC'}
          </Badge>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon className="h-4.5 w-4.5 shrink-0" />
          Settings
        </NavLink>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
            className="rounded p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <span className="truncate text-sm font-medium text-gray-500">{subtitle}</span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-[220px] truncate text-sm text-gray-600 sm:block">
              {user?.email}
            </span>
            <button
              type="button"
              title="Log out"
              onClick={() => {
                authApi.logout().finally(() => {
                  window.location.href = '/'
                })
              }}
              className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOutIcon className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
