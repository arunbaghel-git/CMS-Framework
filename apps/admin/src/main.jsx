import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import './index.css'

/**
 * `basename` `/admin` hai — Vite ka `base` bhi wahi hai (vite.config.js).
 * Admin same origin pe serve hota hai (D-12), isliye cookies aur CSRF bina kisi
 * cross-origin jugaad ke kaam karte hain.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
