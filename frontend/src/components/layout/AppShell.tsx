import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { authApi } from '@/features/auth/api'
import { UserType } from '@/features/auth/types'
import { useProfile } from '@/features/profile/useProfile'
import { navFor } from './navigation'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronUpDownIcon,
  LogOutIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  XIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useTheme } from '@/lib/useTheme'
import { motion, slideIn, duration } from '@/lib/motion'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group/nav relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
    'max-sm:min-h-11',
    isActive
      ? 'bg-brand-subtle text-brand-ink'
      : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
  )

/**
 * After client-side navigation, move focus to the new page's heading so keyboard and
 * screen-reader users land on the content. Pages load lazily, so wait briefly for the h1.
 */
function useFocusOnNavigation(pathname: string, mainRef: React.RefObject<HTMLElement | null>) {
  // Compare against the last path rather than a "first render" flag: StrictMode re-runs effects in
  // development, which would otherwise steal focus on initial load.
  const lastPathname = useRef(pathname)

  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    let attempts = 0
    let timer: number
    const tryFocus = () => {
      const heading = mainRef.current?.querySelector<HTMLElement>('h1')
      if (heading) {
        heading.focus({ preventScroll: false })
      } else if (attempts++ < 40) {
        timer = window.setTimeout(tryFocus, 50)
      } else {
        mainRef.current?.focus()
      }
    }
    tryFocus()
    return () => window.clearTimeout(timer)
  }, [pathname, mainRef])
}

/** Fades the page in on navigation, so a route change reads as a change. */
function usePageTransition(pathname: string, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const animation = motion(element, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: duration.quick,
      ease: 'outQuint',
    })
    return () => {
      animation?.revert()
    }
  }, [pathname, ref])
}

export const AppShell = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()
  const { displayName, logoUrl, subtitle } = useProfile()
  const location = useLocation()
  const drawerRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const { resolved, toggle } = useTheme()
  const palette = useCommandPalette()

  useEffect(() => setMenuOpen(false), [location.pathname])
  useFocusTrap(drawerRef, menuOpen, () => setMenuOpen(false))
  useFocusOnNavigation(location.pathname, mainRef)
  usePageTransition(location.pathname, pageRef)

  // The drawer springs in from the left edge it is attached to.
  useEffect(() => {
    if (!menuOpen || !drawerRef.current) return
    const animation = slideIn(drawerRef.current, 'left')
    return () => {
      animation?.revert()
    }
  }, [menuOpen])

  const groups = navFor(user?.userType)
  const isStartup = user?.userType === UserType.STARTUP

  const sidebar = (
    <>
      {/* Workspace: who you are acting as. Doubles as the brand mark, which is
          how every tool in this category opens its sidebar. */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <EntityAvatar name={displayName || 'Dashboard'} logoUrl={logoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{displayName || 'Set up profile'}</p>
          <p className="label-micro truncate normal-case tracking-normal">
            {isStartup ? 'Startup workspace' : 'Investor workspace'}
          </p>
        </div>
        {menuOpen ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="lg:hidden"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <ChevronUpDownIcon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        )}
      </div>

      {/* Search is the first thing in the sidebar because ⌘K is the fastest path
          to anything in a product this wide. */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={palette.open}
          className={cn(
            'flex w-full items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 py-2',
            'text-[13px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45'
          )}
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="hidden rounded border border-line bg-surface px-1 font-sans text-[10px] text-ink-muted sm:block">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav aria-label="Main" className="scrollbar-slim flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="label-micro mb-1 px-2.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {/* The active marker is a rail on the left edge rather than a
                          filled block: it survives the row being hovered. */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand transition-transform duration-200',
                          isActive ? 'scale-y-100' : 'scale-y-0'
                        )}
                      />
                      <Icon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          isActive ? 'text-brand' : 'text-ink-muted group-hover/nav:text-ink-secondary'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          Settings
        </NavLink>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-ink focus:shadow-overlay focus:ring-2 focus:ring-brand"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgb(10_12_18/0.5)] backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className="relative flex h-full w-[272px] flex-col border-r border-line bg-surface shadow-overlay focus:outline-none"
          >
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky, translucent: the page scrolls under it, which keeps the page
            title and actions reachable on long tables. */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="-ml-2 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>

          <span className="truncate text-[13px] text-ink-secondary">{subtitle}</span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={palette.open}
              aria-label="Search"
              className="lg:hidden"
            >
              <SearchIcon className="size-4" aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {resolved === 'dark' ? (
                <SunIcon className="size-4" aria-hidden="true" />
              ) : (
                <MoonIcon className="size-4" aria-hidden="true" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
                  aria-label="Account"
                >
                  <EntityAvatar name={user?.email ?? 'You'} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate font-normal text-ink-muted">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/settings" className="flex items-center gap-2">
                    <SettingsIcon className="size-4" aria-hidden="true" />
                    Settings
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    authApi.logout().finally(() => {
                      window.location.href = '/'
                    })
                  }}
                >
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <div ref={pageRef} className="mx-auto max-w-[1180px]">
            {/* Keyed on the route so one broken screen doesn't take the navigation down with it. */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <CommandPalette open={palette.isOpen} onOpenChange={palette.setOpen} />
    </div>
  )
}
