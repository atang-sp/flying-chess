import { describe, expect, it } from 'vitest'
import {
  clearAllLocalGameData,
  GAME_MODE_STORAGE_KEY,
  VICTORY_CONFIG_STORAGE_KEY,
  loadGameMode,
  loadVictoryConfig,
  LOCAL_GAME_STORAGE_KEYS,
  saveGameMode,
  saveVictoryConfig,
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

  it('为老用户提供默认终局奖惩并持久化合法自定义', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }

    expect(loadVictoryConfig(storage)).toEqual({
      actionText: '用手掌打屁股',
      baseCount: 5,
      countUnit: '下',
      loserGradientEnabled: false,
      gradientStep: 5,
    })

    saveVictoryConfig(
      {
        actionText: '完成指定挑战',
        baseCount: 2,
        countUnit: '轮',
        loserGradientEnabled: true,
        gradientStep: 1,
      },
      storage
    )

    expect(loadVictoryConfig(storage)).toEqual({
      actionText: '完成指定挑战',
      baseCount: 2,
      countUnit: '轮',
      loserGradientEnabled: true,
      gradientStep: 1,
    })
    expect(LOCAL_GAME_STORAGE_KEYS).toContain(VICTORY_CONFIG_STORAGE_KEY)
  })
})
