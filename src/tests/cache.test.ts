import { describe, expect, it } from 'vitest'
import {
  clearAllLocalGameData,
  GAME_MODE_STORAGE_KEY,
  VICTORY_CONFIG_STORAGE_KEY,
  PARTY_EVENT_DECK_STORAGE_KEY,
  LOCAL_PROGRESS_STORAGE_KEY,
  loadGameMode,
  loadPartyEventDeck,
  loadLocalProgress,
  loadVictoryConfig,
  LOCAL_GAME_STORAGE_KEYS,
  saveGameMode,
  saveVictoryConfig,
  savePartyEventDeck,
  saveLocalProgress,
} from '../utils/cache'
import { DEFAULT_PARTY_EVENT_DECK } from '../services/partyEvents'
import { recordLocalProgress } from '../services/localProgress'

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

  it('老用户默认经典局并按规则集版本记住最后一次合法玩法选择', () => {
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
    expect(JSON.parse(values.get(GAME_MODE_STORAGE_KEY) ?? '')).toEqual({
      mode: 'party',
      rulesetVersion: 'party_v2',
    })
    expect(loadGameMode(storage)).toBe('party')

    values.set(GAME_MODE_STORAGE_KEY, 'party')
    expect(loadGameMode(storage)).toBe('classic')

    values.set(GAME_MODE_STORAGE_KEY, JSON.stringify({ mode: 'party', rulesetVersion: 'party_v1' }))
    expect(loadGameMode(storage)).toBe('classic')

    values.set(GAME_MODE_STORAGE_KEY, 'classic')
    expect(loadGameMode(storage)).toBe('classic')

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

  it('事件卡包只持久化通过校验的内容并对损坏缓存回退默认池', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }

    expect(loadPartyEventDeck(storage)).toEqual(DEFAULT_PARTY_EVENT_DECK)
    const custom = [{ ...DEFAULT_PARTY_EVENT_DECK[0], title: '自定义全员加码' }]
    expect(savePartyEventDeck(custom, storage)).toBe(true)
    expect(loadPartyEventDeck(storage)).toEqual(custom)

    values.set(PARTY_EVENT_DECK_STORAGE_KEY, '{broken')
    expect(loadPartyEventDeck(storage)).toEqual(DEFAULT_PARTY_EVENT_DECK)
    expect(savePartyEventDeck([], storage)).toBe(false)
    expect(LOCAL_GAME_STORAGE_KEYS).toContain(PARTY_EVENT_DECK_STORAGE_KEY)
  })

  it('跨局进度和耻辱墙仅保存在本地并随清除入口一起移除', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        values.set(key, value)
      },
    }
    const progress = recordLocalProgress(loadLocalProgress(storage), {
      kind: 'punishment_completed',
      playerName: '小红',
      count: 5,
    })

    expect(saveLocalProgress(progress, storage)).toBe(true)
    expect(loadLocalProgress(storage)).toEqual(progress)
    expect(LOCAL_GAME_STORAGE_KEYS).toContain(LOCAL_PROGRESS_STORAGE_KEY)
  })
})
