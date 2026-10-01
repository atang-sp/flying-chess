import { ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../services/supabaseClient'
import { initializeAccountStorage, switchAccountStorage } from '../services/accountStorage'

const currentUser = ref<User | null>(null)
const currentSession = ref<Session | null>(null)
const isInitialized = ref(false)
const isPasswordRecovery = ref(false)
const authError = ref<string | null>(null)
let initialization: Promise<void> | null = null
let authRevision = 0

function applySession(session: Session | null): void {
  switchAccountStorage(session?.user.id ?? 'guest')
  currentSession.value = session
  currentUser.value = session?.user ?? null
}

function deferSync(): void {
  // Supabase auth callbacks run under its session lock: never await API calls here.
  setTimeout(() => {
    void import('../services/syncEngine').then(({ syncEngine }) => syncEngine.pullAndMerge())
  }, 0)
}

export function useAuth() {
  const initAuth = (): Promise<void> => {
    if (initialization) return initialization
    initialization = (async () => {
      if (!isSupabaseConfigured) {
        isInitialized.value = true
        return
      }
      try {
        initializeAccountStorage()
        supabase.auth.onAuthStateChange((event, session) => {
          authRevision++
          try {
            applySession(session)
            if (event === 'PASSWORD_RECOVERY') isPasswordRecovery.value = true
            if (!session) isPasswordRecovery.value = false
            if (session && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event))
              deferSync()
          } catch (error) {
            currentUser.value = null
            currentSession.value = null
            authError.value =
              error instanceof Error ? error.message : 'Could not restore account data'
          }
        })
        const revision = authRevision
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (revision === authRevision) {
          applySession(data.session)
          if (data.session) deferSync()
        }
      } catch (error) {
        authError.value = error instanceof Error ? error.message : 'Authentication failed'
      } finally {
        isInitialized.value = true
      }
    })()
    return initialization
  }

  const signOut = async (): Promise<boolean> => {
    if (!isSupabaseConfigured) return false
    authError.value = null
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      applySession(null)
      return true
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Sign out failed'
      return false
    }
  }

  return {
    currentUser,
    currentSession,
    isInitialized,
    isPasswordRecovery,
    authError,
    isSupabaseConfigured,
    initAuth,
    signOut,
  }
}
