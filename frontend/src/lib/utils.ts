import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the URL only if it is an absolute http(s) link. Profile websites, pitch decks and event
 * links are user-supplied, and React renders `javascript:` hrefs as-is, so every external link
 * built from API data should pass through this.
 */
export function safeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}
