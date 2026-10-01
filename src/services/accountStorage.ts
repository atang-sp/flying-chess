import { LOCAL_GAME_STORAGE_KEYS } from '../utils/cache'
import { activeAccount, accountEpoch, storageRevision } from './syncRuntime'
import { lastSyncedAt, loadLastSyncedAt, syncStatus, syncError } from './syncState'
import { storageForAccount } from './scopedStorage'

export function initializeAccountStorage(): void {
  // Legacy unscoped data belongs to the guest. Account data always uses its own keys.
  activeAccount.value = 'guest'
}

export function switchAccountStorage(owner: string): void {
  if (activeAccount.value === owner) return
  accountEpoch.value++
  activeAccount.value = owner
  lastSyncedAt.value = loadLastSyncedAt()
  syncStatus.value = 'idle'
  syncError.value = null
  storageRevision.value++
}

export function readGuestData(): Record<string, string> {
  const storage = storageForAccount('guest')
  return Object.fromEntries(
    LOCAL_GAME_STORAGE_KEYS.flatMap(key => {
      const value = storage.getItem(key)
      return value === null ? [] : [[key, value]]
    })
  )
}

export function hasGuestData(): boolean {
  const guest = readGuestData()
  return Boolean(guest.ludo_game_config || guest['flying-chess-local-progress-v1'])
}
