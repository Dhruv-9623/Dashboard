import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

async function start() {
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
