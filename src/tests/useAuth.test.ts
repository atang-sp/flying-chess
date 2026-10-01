import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const backend = vi.hoisted(() => ({
  session: null as Session | null,
  callback: null as ((event: AuthChangeEvent, session: Session | null) => void) | null,
  signOutError: false,
  sync: vi.fn(async () => true),
}))
vi.mock('../services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      onAuthStateChange(callback: typeof backend.callback) {
        backend.callback = callback
      },
      async getSession() {
        return { data: { session: backend.session }, error: null }
      },
      async signOut() {
        return { error: backend.signOutError ? new Error('Offline') : null }
      },
    },
  },
}))
vi.mock('../services/syncEngine', () => ({ syncEngine: { pullAndMerge: backend.sync } }))

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  backend.sync.mockClear()
  backend.callback = null
  backend.signOutError = false
  backend.session = { user: { id: 'A' } } as Session
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('restored sessions synchronize outside the auth callback lock', async () => {
  const { useAuth } = await import('../composables/useAuth')
  const auth = useAuth()
  await auth.initAuth()
  expect(auth.currentUser.value?.id).toBe('A')
  expect(backend.sync).not.toHaveBeenCalled()
  await vi.runAllTimersAsync()
  expect(backend.sync).toHaveBeenCalled()
  backend.sync.mockClear()
  expect(backend.callback?.('SIGNED_IN', backend.session)).toBeUndefined()
  expect(backend.sync).not.toHaveBeenCalled()
  await vi.runAllTimersAsync()
  expect(backend.sync).toHaveBeenCalled()
})

it('failed sign-out retains the authenticated account and exposes the error', async () => {
  const { useAuth } = await import('../composables/useAuth')
  const auth = useAuth()
  await auth.initAuth()
  backend.signOutError = true
  expect(await auth.signOut()).toBe(false)
  expect(auth.currentUser.value?.id).toBe('A')
  expect(auth.authError.value).toBe('Offline')
  backend.signOutError = false
  expect(await auth.signOut()).toBe(true)
  expect(auth.currentUser.value).toBeNull()
})

it('password recovery opens an explicit recovery state', async () => {
  const { useAuth } = await import('../composables/useAuth')
  const auth = useAuth()
  await auth.initAuth()
  backend.callback?.('PASSWORD_RECOVERY', backend.session)
  expect(auth.isPasswordRecovery.value).toBe(true)
  backend.callback?.('SIGNED_OUT', null)
  expect(auth.isPasswordRecovery.value).toBe(false)
})
