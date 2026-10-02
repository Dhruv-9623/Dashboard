import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { initTheme } from './lib/useTheme'
import './index.css'

async function start() {
  // Before the first paint, so a dark-mode viewer never sees a white flash.
  initTheme()

  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
    const { installMocks } = await import('./mocks')
    installMocks()
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

start()
