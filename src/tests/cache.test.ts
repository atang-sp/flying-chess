import { describe, expect, it } from 'vitest'
import {
  clearAllLocalGameData,
  GAME_MODE_STORAGE_KEY,
  loadGameMode,
  LOCAL_GAME_STORAGE_KEYS,
  saveGameMode,
} from '../utils/cache'

describe('本地游戏数据清理', () => {
  it('清除配置、玩家、备份和引导偏好使用的实际键名', () => {
    const values = new Map<string, string>(LOCAL_GAME_STORAGE_KEYS.map(key => [key, 'saved']))
    const storage = {
      removeItem(key: string) {
        values.delete(key)
      },
    }

    clearAllLocalGameData(storage)

    expect([...values.keys()]).toEqual([])
  })

  it('老用户默认经典局并记住最后一次合法玩法选择', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }

    expect(loadGameMode(storage)).toBe('classic')

    saveGameMode('party', storage)
    expect(values.get(GAME_MODE_STORAGE_KEY)).toBe('party')
    expect(loadGameMode(storage)).toBe('party')

    values.set(GAME_MODE_STORAGE_KEY, 'unknown')
    expect(loadGameMode(storage)).toBe('classic')
    expect(LOCAL_GAME_STORAGE_KEYS).toContain(GAME_MODE_STORAGE_KEY)
  })
})
