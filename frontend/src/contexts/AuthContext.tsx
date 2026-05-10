import React, { createContext, useContext, ReactNode, Suspense, lazy, useMemo, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { NoAuthProvider } from './NoAuthProvider'

// Lazy-loaded so the Clerk SDK (77 KiB gzip) is not part of the initial bundle.
// Unauthenticated visits to the landing page never need it.
const ClerkAuthProvider = lazy(() =>
  import('./ClerkAuthProvider').then((m) => ({ default: m.ClerkAuthProvider }))
)

export interface User {
  id: string | null // Nullable to handle cases where backend UUID is unavailable
  email: string
  username?: string | null
  firstName?: string
  lastName?: string
  imageUrl?: string
  has_seen_welcome?: boolean
  publicMetadata?: {
    role?: string
    [key: string]: unknown
  }
}

export interface AuthContextType {
  // Core auth state
  isLoaded: boolean
  isAuthenticated: boolean
  user: User | null

  // Token management
  getToken: () => Promise<string | null>

  // Refresh user data (only needed for Clerk mode, after mutations like username change)
  refreshUser?: () => Promise<void>

  // Auth actions (only available in Clerk mode)
  signOut?: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Placeholder context while the Clerk SDK chunk is still loading. Mirrors
// Clerk's "not yet loaded" state so consumers (ProtectedRoute, AuthRedirect)
// show their usual spinners instead of redirecting.
const PendingAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useMemo<AuthContextType>(
    () => ({
      isLoaded: false,
      isAuthenticated: false,
      user: null,
      getToken: async () => null,
    }),
    []
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Anonymous-on-marketing context: Clerk is intentionally never loaded, so the
// auth state is *known* (anonymous) rather than pending. Renders with
// `isLoaded: false` on the first paint to match the prerendered HTML, then
// flips to `isLoaded: true` after mount so any consumer waiting on the
// AuthContext contract can proceed. The post-mount flip is a normal state
// update, not a hydration mismatch.
const MarketingAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  useEffect(() => {
    setIsLoaded(true)
  }, [])
  const value = useMemo<AuthContextType>(
    () => ({
      isLoaded,
      isAuthenticated: false,
      user: null,
      getToken: async () => null,
    }),
    [isLoaded],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Routes that always need Clerk: auth flows + the authenticated app shell.
// Anything not matching is treated as a marketing/SEO route and only
// hydrates Clerk if a session cookie is already present. Public marketing
// routes live in `data/publicRoutes.ts`; this list is the inverse and is
// kept inline because it only needs to identify the auth boundary, not
// every individual marketing path.
const AUTH_REQUIRED_PREFIXES = [
  '/sign-in',
  '/sign-up',
  // /waitlist runs Clerk's CapacityGate + AuthRedirect logic and lives behind
  // ClerkProvider's `waitlistUrl` config — Clerk needs to be hydrated for
  // sign-up gating to work. (Per gemini-code-assist on PR #337.)
  '/waitlist',
  '/dashboard',
  '/tasks',
  '/settings',
  '/admin',
  '/welcome',
  '/explore',
] as const

function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

// Clerk sets `__client_uat` (user authenticated timestamp) on the app domain.
// It's JS-readable by design — Clerk uses it client-side to detect "is this
// browser signed in" before paying the cost of loading the full SDK. We use
// the same probe so logged-in users on / still get the "Dashboard" nav.
// Note: `__session` is the JWT and is HttpOnly under Clerk's defaults, so it
// can't be read from JS. Only `__client_uat` works as a cheap signal here.
function hasClerkSession(): boolean {
  if (typeof document === 'undefined') return false
  return /(?:^|;\s*)__client_uat=/.test(document.cookie)
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // useLocation must run unconditionally to satisfy rules-of-hooks. The early
  // returns below short-circuit on env constants (NOAUTH, __PRERENDER__) which
  // never change across renders for a given app instance, so React's hook
  // order stays stable in practice — but reading the location up front keeps
  // the dependency obvious and lint-clean.
  const { pathname } = useLocation()

  // VITE_WEBWHEN_NOAUTH is the local-dev escape hatch — runs against a mocked
  // user end-to-end. NoAuthProvider returns a stable mock user so dev flows
  // work without Clerk.
  if (import.meta.env.VITE_WEBWHEN_NOAUTH === '1') {
    return <NoAuthProvider>{children}</NoAuthProvider>
  }

  // Prerender uses the same "not yet loaded" shape that the runtime Suspense
  // fallback emits — both produce HTML matching `user: null, isLoaded: false`.
  // Without this, the prerender baked a logged-in mock user (NoAuthProvider's
  // default) into HTML, and the runtime ClerkAuthProvider's Suspense fallback
  // hydrated against null, tripping React #418/#423 hydration mismatches on
  // every marketing route. See #299.
  if (window.__PRERENDER__) {
    return <PendingAuthProvider>{children}</PendingAuthProvider>
  }

  // Anonymous visitor on a marketing route: skip the Clerk lazy import so
  // /, /changelog, /compare/*, /use-cases/*, /concepts/*, /terms, /privacy
  // never trigger ~250 KiB of Clerk SDK + 2 auth XHRs during the LCP window.
  // Logged-in users (cookie present) still get Clerk hydrated so Nav can
  // swap "Sign in" → "Dashboard".
  if (!isAuthRequiredPath(pathname) && !hasClerkSession()) {
    return <MarketingAuthProvider>{children}</MarketingAuthProvider>
  }

  return (
    <Suspense fallback={<PendingAuthProvider>{children}</PendingAuthProvider>}>
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    </Suspense>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthContext }
