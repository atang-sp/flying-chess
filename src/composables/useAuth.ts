import { ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../services/supabaseClient'

// ============================================================
// 全局单例 Auth 状态（在所有 composable 调用间共享）
// ============================================================
const currentUser = ref<User | null>(null)
const currentSession = ref<Session | null>(null)
const isInitialized = ref(false)
let listenerAttached = false

/**
 * 全局 Auth Composable。
 * - 第一次调用时会设置 onAuthStateChange 监听（单次）。
 * - 其余调用直接共享相同的响应式状态。
 */
export function useAuth() {
  const initAuth = async () => {
    if (isInitialized.value) return
    if (!isSupabaseConfigured) {
      isInitialized.value = true
      return
    }

    try {
      // 取当前 session（页面刷新后恢复）
      const { data } = await supabase.auth.getSession()
      currentSession.value = data.session
      currentUser.value = data.session?.user ?? null

      // 挂载全局监听器（只挂一次）
      if (!listenerAttached) {
        listenerAttached = true
        supabase.auth.onAuthStateChange(async (event, session) => {
          currentSession.value = session
          currentUser.value = session?.user ?? null

          if (event === 'SIGNED_IN') {
            // 登录时从云端拉取并合并数据
            const { syncEngine } = await import('../services/syncEngine')
            await syncEngine.pullAndMerge()
          }
        })
      }
    } catch (err) {
      console.warn('[useAuth] 初始化失败:', err)
    } finally {
      isInitialized.value = true
    }
  }

  /** 退出登录 */
  const signOut = async () => {
    if (!isSupabaseConfigured) return
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[useAuth] 登出失败:', err)
    } finally {
      currentUser.value = null
      currentSession.value = null
    }
  }

  return {
    currentUser,
    currentSession,
    isInitialized,
    isSupabaseConfigured,
    initAuth,
    signOut,
  }
}
