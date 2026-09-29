import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mergeProgress, collectLocalSettings, type CloudProgressRow } from '../services/syncEngine'
import {
  resolveSupabaseConfig,
  saveDevSupabaseCredentials,
  clearDevSupabaseCredentials,
  DEV_SUPABASE_URL_KEY,
  DEV_SUPABASE_ANON_KEY,
} from '../services/supabaseClient'
import type { LocalProgress } from '../services/localProgress'

describe('syncEngine — mergeProgress 智能合并', () => {
  it('云端数据为空时直接保留本地数据', () => {
    const local: LocalProgress = {
      version: 1,
      totals: {
        completedGames: 5,
        punishmentCount: 12,
        mercyRequests: 2,
        longestChain: 3,
        variantCompletions: {},
      },
      players: {},
    }
    const merged = mergeProgress(local, null as unknown as CloudProgressRow)
    expect(merged.totals.completedGames).toBe(5)
  })

  it('统计总数取本地与云端的最大值 (Math.max)', () => {
    const local: LocalProgress = {
      version: 1,
      totals: {
        completedGames: 3,
        punishmentCount: 10,
        mercyRequests: 2,
        longestChain: 4,
        variantCompletions: {
          blindbox: 2,
          conditional: 5,
        },
      },
      players: {},
    }

    const cloud: CloudProgressRow = {
      totals: {
        completedGames: 6,
        punishmentCount: 8,
        mercyRequests: 5,
        longestChain: 2,
        variantCompletions: {
          blindbox: 4,
          deferred: 1,
        },
      },
      shame_records: {},
    }

    const merged = mergeProgress(local, cloud)

    expect(merged.totals.completedGames).toBe(6) // max(3, 6)
    expect(merged.totals.punishmentCount).toBe(10) // max(10, 8)
    expect(merged.totals.mercyRequests).toBe(5) // max(2, 5)
    expect(merged.totals.longestChain).toBe(4) // max(4, 2)
    expect(merged.totals.variantCompletions.blindbox).toBe(4) // max(2, 4)
    expect(merged.totals.variantCompletions.conditional).toBe(5) // max(5, 0)
    expect(merged.totals.variantCompletions.deferred).toBe(1) // max(0, 1)
  })

  it('耻辱墙玩家记录进行并集合并且取两端最大值', () => {
    const local: LocalProgress = {
      version: 1,
      totals: {
        completedGames: 1,
        punishmentCount: 1,
        mercyRequests: 0,
        longestChain: 0,
        variantCompletions: {},
      },
      players: {
        Alice: { playerName: 'Alice', punishmentCount: 5, mercyRequests: 1 },
        Bob: { playerName: 'Bob', punishmentCount: 3, mercyRequests: 0 },
      },
    }

    const cloud: CloudProgressRow = {
      shame_records: {
        Alice: { punishmentCount: 2, mercyRequests: 4 },
        Charlie: { punishmentCount: 7, mercyRequests: 2 },
      },
    }

    const merged = mergeProgress(local, cloud)

    // Alice: max(5, 2) = 5, max(1, 4) = 4
    expect(merged.players.Alice.punishmentCount).toBe(5)
    expect(merged.players.Alice.mercyRequests).toBe(4)

    // Bob: 仅存在于本地
    expect(merged.players.Bob.punishmentCount).toBe(3)
    expect(merged.players.Bob.mercyRequests).toBe(0)

    // Charlie: 仅存在于云端
    expect(merged.players.Charlie.punishmentCount).toBe(7)
    expect(merged.players.Charlie.mercyRequests).toBe(2)
  })
})

describe('syncEngine & supabaseClient — 本地存储交互', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, String(val)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('能够成功收集本地全量配置快照且包含 savedAt 时间戳', () => {
    const settings = collectLocalSettings()
    expect(settings).toBeDefined()
    expect(typeof settings.savedAt).toBe('number')
    expect(settings.savedAt).toBeGreaterThan(0)
    expect(settings.victoryConfig).toBeDefined()
    expect(Array.isArray(settings.partyEventDeck)).toBe(true)
  })

  it('未配置环境变量且无本地凭据时返回未就绪状态', () => {
    const config = resolveSupabaseConfig()
    if (!import.meta.env.VITE_SUPABASE_URL) {
      expect(config.isConfigured).toBe(false)
      expect(config.isDevOverride).toBe(false)
    }
  })

  it('可通过 saveDevSupabaseCredentials 设置并在 resolve 时激活', () => {
    saveDevSupabaseCredentials('https://test-project.supabase.co', 'test-anon-key')
    expect(store.get(DEV_SUPABASE_URL_KEY)).toBe('https://test-project.supabase.co')
    expect(store.get(DEV_SUPABASE_ANON_KEY)).toBe('test-anon-key')

    const resolved = resolveSupabaseConfig()
    expect(resolved.isConfigured).toBe(true)
    expect(resolved.isDevOverride).toBe(true)
    expect(resolved.url).toBe('https://test-project.supabase.co')
    expect(resolved.key).toBe('test-anon-key')

    clearDevSupabaseCredentials()
    expect(store.has(DEV_SUPABASE_URL_KEY)).toBe(false)
  })
})
