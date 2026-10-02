import { useEffect } from 'react'

// Product name is still to be decided; update here once it is.
const APP_NAME = 'Dashboard'

/** Gives every screen a distinct browser-tab title (WCAG 2.4.2), e.g. "Pool · Dashboard". */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
