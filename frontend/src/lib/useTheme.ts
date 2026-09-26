import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dashboard-theme'

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches === true

const read = (): ThemeChoice => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Private mode, or storage blocked. System is the right default either way.
  }
  return 'system'
}

const apply = (choice: ThemeChoice) => {
  const dark = choice === 'dark' || (choice === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  // Native form controls, scrollbars and the phone's URL bar follow this.
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * Light/dark/system, applied by toggling `.dark` on <html> — which is all the
 * token system needs, since every colour in the app resolves through a variable
 * that `.dark` redefines.
 */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(read)

  useEffect(() => {
    apply(choice)
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // Not worth surfacing: the theme still applies for this session.
    }
  }, [choice])

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (choice !== 'system' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])

  const resolved: 'light' | 'dark' =
    choice === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : choice

  const toggle = useCallback(() => {
    setChoice(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved])

  return { choice, resolved, setChoice, toggle }
}

/**
 * Applies the stored theme before React mounts, so a dark-mode viewer never
 * sees a white flash. Called from main.tsx.
 */
export function initTheme() {
  apply(read())
}
