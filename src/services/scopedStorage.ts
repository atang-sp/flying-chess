import { activeAccount } from './syncRuntime'

export function storageForAccount(
  owner: string
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const keyFor = (key: string) => (owner === 'guest' ? key : `flying_chess_data:${owner}:${key}`)
  return {
    getItem: key => localStorage.getItem(keyFor(key)),
    setItem: (key, value) => localStorage.setItem(keyFor(key), value),
    removeItem: key => localStorage.removeItem(keyFor(key)),
  }
}

// Resolve the active account for each synchronous operation. Guest keys retain their
// legacy names, so upgrading never silently assigns existing guest data to an account.
export const scopedStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: key => storageForAccount(activeAccount.value).getItem(key),
  setItem: (key, value) => storageForAccount(activeAccount.value).setItem(key, value),
  removeItem: key => storageForAccount(activeAccount.value).removeItem(key),
}
