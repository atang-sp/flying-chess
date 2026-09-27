import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(
  rawUrl && rawKey && rawUrl.startsWith('http') && rawUrl !== 'https://placeholder.supabase.co'
)

// When Supabase environment variables are missing (e.g., CI, development without Supabase, or self-hosted deployment),
// initialize a placeholder client so module loading and tree-shaking succeed without throwing "supabaseUrl is required".
const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
