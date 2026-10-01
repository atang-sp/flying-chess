import { scopedStorage } from './scopedStorage'
import { ref } from 'vue'

export const SETTINGS_UPDATED_KEY = 'local_settings_updated_at'
export const PENDING_SYNC_KEY = 'flying_chess_pending_sync'
export const syncRequested = ref(0)
export const storageRevision = ref(0)
export const accountEpoch = ref(0)
export const activeAccount = ref('guest')

export function requestSync(kind: 'settings' | 'progress'): void {
  if (typeof localStorage === 'undefined') return
  const pending = readPending()
  pending[kind] = (pending[kind] ?? 0) + 1
  scopedStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending))
  if (kind === 'settings') {
    const previous = Number(scopedStorage.getItem(SETTINGS_UPDATED_KEY)) || 0
    scopedStorage.setItem(SETTINGS_UPDATED_KEY, String(Math.max(Date.now(), previous + 1)))
  }
  syncRequested.value++
}

export function readPending(): Partial<Record<'settings' | 'progress', number>> {
  try {
    const value: unknown = JSON.parse(scopedStorage.getItem(PENDING_SYNC_KEY) || '{}')
    if (!value || typeof value !== 'object') return {}
    const pending = value as Partial<Record<'settings' | 'progress', number>>
    return Object.fromEntries(
      Object.entries(pending).filter(
        ([key, revision]) =>
          ['settings', 'progress'].includes(key) &&
          Number.isSafeInteger(revision) &&
          Number(revision) > 0
      )
    )
  } catch {
    return {}
  }
}

export function acknowledgeSync(kind: 'settings' | 'progress', revision: number): void {
  const pending = readPending()
  if (pending[kind] !== revision) return
  delete pending[kind]
  scopedStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending))
}
