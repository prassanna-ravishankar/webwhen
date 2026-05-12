import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider, hasActiveClerkSessionCookie, useAuth } from './AuthContext'

function AuthProbe() {
  const auth = useAuth()
  return (
    <div
      data-auth-loaded={String(auth.isLoaded)}
      data-authenticated={String(auth.isAuthenticated)}
    />
  )
}

describe('hasActiveClerkSessionCookie', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('treats missing Clerk state as anonymous', () => {
    expect(hasActiveClerkSessionCookie('')).toBe(false)
    expect(hasActiveClerkSessionCookie('theme=light')).toBe(false)
    expect(hasActiveClerkSessionCookie('__client_uatbackup=1778560000')).toBe(false)
  })

  it('treats Clerk signed-out marker cookies as anonymous', () => {
    expect(hasActiveClerkSessionCookie('__client_uat=0')).toBe(false)
    expect(hasActiveClerkSessionCookie('__client_uat=0; __client_uat_UU_Qftd4=0')).toBe(false)
  })

  it('detects active Clerk timestamp cookies', () => {
    expect(hasActiveClerkSessionCookie('__client_uat=1778560000')).toBe(true)
    expect(hasActiveClerkSessionCookie('__client_uat = 1778560000')).toBe(true)
    expect(hasActiveClerkSessionCookie('foo=bar; __client_uat_UU_Qftd4=1778560000')).toBe(true)
  })

  it('keeps the first marketing-route render anonymous with an active Clerk cookie', () => {
    vi.stubGlobal('window', { __PRERENDER__: false, CONFIG: {} })
    vi.stubGlobal('document', { cookie: '__client_uat=1778560000' })

    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(html).toContain('data-auth-loaded="false"')
    expect(html).toContain('data-authenticated="false"')
  })
})
