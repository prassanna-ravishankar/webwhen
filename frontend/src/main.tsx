import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import { RootErrorBoundary } from './components/RootErrorBoundary'
import App from './App'
import './index.css'

// BrowserRouter is above AuthProvider so AuthProvider can read useLocation()
// to decide whether the current route needs Clerk hydrated. Marketing routes
// without a Clerk session cookie skip the lazy import entirely.
const app = (
  <React.StrictMode>
    <RootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </RootErrorBoundary>
  </React.StrictMode>
)

const root = document.getElementById('root')!

// Hydrate if prerendered HTML exists, otherwise render from scratch
if (root.children.length > 0) {
  ReactDOM.hydrateRoot(root, app)
} else {
  ReactDOM.createRoot(root).render(app)
}
