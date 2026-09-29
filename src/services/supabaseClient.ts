import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const DEV_SUPABASE_URL_KEY = 'flying_chess_dev_supabase_url'
export const DEV_SUPABASE_ANON_KEY = 'flying_chess_dev_supabase_anon_key'

export interface SupabaseConfigResolution {
  readonly url: string
  readonly key: string
  readonly isConfigured: boolean
  readonly isDevOverride: boolean
}
export function resolveSupabaseConfig(): SupabaseConfigResolution {
  // 1. 允许在本地浏览器测试时通过 localStorage 注入凭证，方便新项目快速联调与覆盖
  if (typeof localStorage !== 'undefined') {
    try {
      const devUrl = (localStorage.getItem(DEV_SUPABASE_URL_KEY) || '').trim()
      const devKey = (localStorage.getItem(DEV_SUPABASE_ANON_KEY) || '').trim()
      if (
        devUrl &&
        devKey &&
        devUrl.startsWith('http') &&
        devUrl !== 'https://placeholder.supabase.co'
      ) {
        return {
          url: devUrl,
          key: devKey,
          isConfigured: true,
          isDevOverride: true,
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 2. 环境变量（.env.local / 构建注入）
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (
    envUrl &&
    envKey &&
    envUrl.startsWith('http') &&
    envUrl !== 'https://placeholder.supabase.co'
  ) {
    return {
      url: envUrl,
      key: envKey,
      isConfigured: true,
      isDevOverride: false,
    }
  }

  return {
    url: 'https://placeholder.supabase.co',
    key: 'placeholder-anon-key',
    isConfigured: false,
    isDevOverride: false,
  }
}

const resolved = resolveSupabaseConfig()

export const isSupabaseConfigured = resolved.isConfigured
export const isDevOverrideActive = resolved.isDevOverride

export const supabase: SupabaseClient = createClient(resolved.url, resolved.key)

export function saveDevSupabaseCredentials(url: string, key: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DEV_SUPABASE_URL_KEY, url.trim())
  localStorage.setItem(DEV_SUPABASE_ANON_KEY, key.trim())
}

export function clearDevSupabaseCredentials(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(DEV_SUPABASE_URL_KEY)
  localStorage.removeItem(DEV_SUPABASE_ANON_KEY)
}
