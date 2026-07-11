import { describe, expect, it } from 'vitest'
import { clearAllLocalGameData, LOCAL_GAME_STORAGE_KEYS } from '../utils/cache'

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
})
