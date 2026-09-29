import { ref } from 'vue'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export const LAST_SYNCED_STORAGE_KEY = 'flying_chess_last_synced_at'

export function loadLastSyncedAt(): number | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_SYNCED_STORAGE_KEY)
    if (!raw) return null
    const num = Number(raw)
    return Number.isFinite(num) && num > 0 ? num : null
  } catch {
    return null
  }
}

export function saveLastSyncedAt(timestamp: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LAST_SYNCED_STORAGE_KEY, String(timestamp))
  } catch {
    /* ignore */
  }
}

export const syncStatus = ref<SyncStatus>('idle')
export const lastSyncedAt = ref<number | null>(loadLastSyncedAt())
export const syncError = ref<string | null>(null)
