/**
 * Sync Engine — 本地优先 (Local-First) 云同步中间件
 *
 * 职责：
 *  - pullAndMerge()：用户登录后从云端拉取配置与成就进度并双向智能合并
 *  - pushSettings()：全量游戏配置异步推送到云端 (user_configs)
 *  - pushProgress()：成就进度与耻辱墙异步推送到云端 (game_progress)
 *  - pushConfig()  ：向后兼容方法
 *  - pushSettingsDebounced()：防抖触发推送
 *  - syncNow()     ：用户在界面上主动触发全量即时同步
 *
 * 设计原则：
 *  - 本地优先（Local-First）：修改优先入 LocalStorage，零延迟离线体验
 *  - 双向智能合并：时间戳比对、数值 MAX 合并、耻辱墙并集合并
 *  - 幂等与防循环：直接写 storage，不触发本地 save 钩子
 *  - 静默容错：网络断开或鉴权失败不阻断本地游戏进程
 */
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { useAuth } from '../composables/useAuth'
import {
  loadConfig,
  saveConfigDirectly,
  loadLocalProgress,
  saveLocalProgressDirectly,
  loadPlayerSettings,
  savePlayerSettingsDirectly,
  loadVictoryConfig,
  saveVictoryConfigDirectly,
  loadPartyEventDeck,
  savePartyEventDeckDirectly,
  loadPartyStudioConfig,
  savePartyStudioConfigDirectly,
  loadGameMode,
  saveGameModeDirectly,
  loadLocalePreference,
  saveLocalePreferenceDirectly,
  type CachedConfig,
  type PlayerSettings,
} from '../utils/cache'
import {
  validateLocalProgress,
  type LocalProgress,
  type LocalPlayerProgress,
  type LocalProgressTotals,
} from './localProgress'
import type {
  BoardConfig,
  PunishmentConfig,
  TrapAction,
  VictoryConfig,
} from '@flying-chess/game-core/types'
import { validatePartyEventDeck, type PartyEventCard } from '@flying-chess/game-core/party-events'
import { validatePartyStudioConfig, type PartyStudioConfig } from './partyStudio'
import type { GameMode } from '../config/modes'

// ================================================================
// 同步状态管理
// ================================================================

export {
  type SyncStatus,
  LAST_SYNCED_STORAGE_KEY,
  syncStatus,
  lastSyncedAt,
  syncError,
  loadLastSyncedAt,
  saveLastSyncedAt,
} from './syncState'
import { syncStatus, lastSyncedAt, syncError, saveLastSyncedAt } from './syncState'

// ================================================================
// 内部工具
// ================================================================

/** 仅在已登录且服务可用时执行 fn，否则静默跳过 */
async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<T | null> {
  if (!isSupabaseConfigured) return null
  const { currentUser } = useAuth()
  if (!currentUser.value) return null
  try {
    return await fn(currentUser.value.id)
  } catch (err) {
    console.warn('[SyncEngine] 网络操作失败（不影响本地游戏）:', err)
    return null
  }
}

// ================================================================
// 结构契约与合并策略
// ================================================================

export interface CloudUserSettings {
  gameConfig?: CachedConfig
  playerSettings?: PlayerSettings
  victoryConfig?: VictoryConfig
  partyEventDeck?: readonly PartyEventCard[]
  partyStudioConfig?: PartyStudioConfig
  locale?: string
  gameMode?: GameMode
  savedAt: number
}

export interface CloudProgressRow {
  totals?: Record<string, unknown>
  shame_records?: Record<string, unknown>
}

export function mergeProgress(local: LocalProgress, cloud: CloudProgressRow): LocalProgress {
  if (!cloud) return local

  const totals: Record<string, unknown> = { ...local.totals }
  if (cloud.totals && typeof cloud.totals === 'object') {
    const cloudTotals = cloud.totals as Record<string, unknown>
    for (const key of Object.keys(cloudTotals)) {
      const cloudVal = cloudTotals[key]
      if (typeof cloudVal === 'number') {
        const localVal = typeof totals[key] === 'number' ? (totals[key] as number) : 0
        totals[key] = Math.max(localVal, cloudVal)
      } else if (
        key === 'variantCompletions' &&
        typeof cloudVal === 'object' &&
        cloudVal !== null
      ) {
        const cloudVc = cloudVal as Record<string, unknown>
        const localVc = (totals.variantCompletions as Record<string, number>) ?? {}
        const vc: Record<string, number> = { ...localVc }
        for (const vk of Object.keys(cloudVc)) {
          const cvk = cloudVc[vk]
          if (typeof cvk === 'number') {
            vc[vk] = Math.max(vc[vk] ?? 0, cvk)
          }
        }
        totals.variantCompletions = vc
      }
    }
  }

  // 耻辱墙：合并两侧玩家记录，取各自最大值
  const players: Record<string, LocalPlayerProgress> = { ...local.players }
  if (cloud.shame_records && typeof cloud.shame_records === 'object') {
    const cloudShame = cloud.shame_records as Record<string, unknown>
    for (const [name, rec] of Object.entries(cloudShame)) {
      if (rec && typeof rec === 'object') {
        const recObj = rec as Record<string, unknown>
        const cloudPunish = typeof recObj.punishmentCount === 'number' ? recObj.punishmentCount : 0
        const cloudMercy = typeof recObj.mercyRequests === 'number' ? recObj.mercyRequests : 0
        const existing = players[name]

        if (!existing) {
          players[name] = {
            playerName: name,
            punishmentCount: cloudPunish,
            mercyRequests: cloudMercy,
          }
        } else {
          players[name] = {
            playerName: name,
            punishmentCount: Math.max(existing.punishmentCount, cloudPunish),
            mercyRequests: Math.max(existing.mercyRequests, cloudMercy),
          }
        }
      }
    }
  }

  return {
    ...local,
    totals: totals as unknown as LocalProgressTotals,
    players,
  }
}

export function collectLocalSettings(): CloudUserSettings {
  return {
    gameConfig: loadConfig() ?? undefined,
    playerSettings: loadPlayerSettings() ?? undefined,
    victoryConfig: loadVictoryConfig(),
    partyEventDeck: loadPartyEventDeck(),
    partyStudioConfig: loadPartyStudioConfig(),
    gameMode: loadGameMode(),
    locale: loadLocalePreference() ?? undefined,
    savedAt: Date.now(),
  }
}

let pushTimeout: ReturnType<typeof setTimeout> | null = null

export function pushSettingsDebounced(delay = 800): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('local_settings_updated_at', Date.now().toString())
  }
  if (pushTimeout) clearTimeout(pushTimeout)
  pushTimeout = setTimeout(() => {
    syncEngine.pushSettings().catch(() => {})
  }, delay)
}

// ================================================================
// 公共 API
// ================================================================

export const syncEngine = {
  /**
   * 登录后调用：从云端拉取 user_configs 和 game_progress，
   * 采用时间戳比较与智能合并策略，写回 LocalStorage。
   */
  async pullAndMerge(): Promise<boolean> {
    syncStatus.value = 'syncing'
    syncError.value = null

    const result = await withUser(async userId => {
      let shouldPushSettings = false
      let shouldPushProgress = false

      // — 1. 拉取游戏配置 —
      const { data: cfgRow, error: cfgErr } = await supabase
        .from('user_configs')
        .select('settings, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (cfgErr) {
        throw cfgErr
      }

      if (cfgRow?.settings && typeof cfgRow.settings === 'object') {
        const rawSettings = cfgRow.settings as Record<string, unknown>

        // A. 棋盘/惩罚/机关配置 (gameConfig)，兼容旧版直接平铺与新版嵌套格式
        const cloudGameConfig: CachedConfig | undefined = rawSettings.gameConfig
          ? (rawSettings.gameConfig as CachedConfig)
          : rawSettings.boardConfig && rawSettings.punishmentConfig && rawSettings.trapConfig
            ? {
                boardConfig: rawSettings.boardConfig as BoardConfig,
                punishmentConfig: rawSettings.punishmentConfig as PunishmentConfig,
                trapConfig: rawSettings.trapConfig as TrapAction[],
                savedAt: typeof rawSettings.savedAt === 'number' ? rawSettings.savedAt : 0,
              }
            : undefined

        const localGameConfig = loadConfig()
        let localSavedAt = localGameConfig?.savedAt ?? 0
        if (typeof localStorage !== 'undefined') {
          const lsu = parseInt(localStorage.getItem('local_settings_updated_at') || '0', 10)
          if (!isNaN(lsu) && lsu > localSavedAt) {
            localSavedAt = lsu
          }
        }
        // Use the bundle's savedAt as the primary timestamp, fallback to gameConfig's savedAt
        const cloudSavedAt =
          (typeof rawSettings.savedAt === 'number'
            ? rawSettings.savedAt
            : cloudGameConfig?.savedAt) ?? 0

        if (cloudGameConfig) {
          if (!localGameConfig || cloudSavedAt > localSavedAt) {
            saveConfigDirectly(cloudGameConfig)
          } else if (localSavedAt > cloudSavedAt) {
            shouldPushSettings = true
          }
        } else if (localGameConfig) {
          shouldPushSettings = true
        }

        // B. 玩家设置 (playerSettings)
        if (rawSettings.playerSettings && typeof rawSettings.playerSettings === 'object') {
          const cloudPlayers = rawSettings.playerSettings as PlayerSettings
          if (
            Number.isSafeInteger(cloudPlayers.playerCount) &&
            cloudPlayers.playerCount >= 1 &&
            Array.isArray(cloudPlayers.playerNames) &&
            cloudPlayers.playerNames.length === cloudPlayers.playerCount
          ) {
            const localPlayers = loadPlayerSettings()
            if (!localPlayers || cloudSavedAt > localSavedAt) {
              savePlayerSettingsDirectly(cloudPlayers)
            }
          }
        }

        // C. 终局奖惩配置 (victoryConfig)
        if (rawSettings.victoryConfig && typeof rawSettings.victoryConfig === 'object') {
          saveVictoryConfigDirectly(rawSettings.victoryConfig as VictoryConfig)
        }

        // D. 升温局事件卡包 (partyEventDeck)
        if (Array.isArray(rawSettings.partyEventDeck)) {
          const deckValidation = validatePartyEventDeck(
            rawSettings.partyEventDeck as PartyEventCard[]
          )
          if (deckValidation.ok) {
            savePartyEventDeckDirectly(rawSettings.partyEventDeck as PartyEventCard[])
          }
        }

        // E. Party Studio 场景配置 (partyStudioConfig)
        if (rawSettings.partyStudioConfig && typeof rawSettings.partyStudioConfig === 'object') {
          const studioValidation = validatePartyStudioConfig(rawSettings.partyStudioConfig)
          if (studioValidation.ok) {
            savePartyStudioConfigDirectly(rawSettings.partyStudioConfig as PartyStudioConfig)
          }
        }

        // F. 游戏模式 (gameMode)
        if (rawSettings.gameMode === 'classic' || rawSettings.gameMode === 'party') {
          saveGameModeDirectly(rawSettings.gameMode as GameMode)
        }

        // G. 语言偏好 (locale)
        if (typeof rawSettings.locale === 'string' && rawSettings.locale.trim()) {
          saveLocalePreferenceDirectly(rawSettings.locale.trim())
        }
      } else {
        // 云端尚无配置，如果本地有则标记上传
        shouldPushSettings = true
      }

      // — 2. 拉取成就进度与耻辱墙 —
      const { data: progRow, error: progErr } = await supabase
        .from('game_progress')
        .select('totals, shame_records, updated_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (progErr) {
        throw progErr
      }

      if (progRow) {
        const localProgress = loadLocalProgress()
        const merged = mergeProgress(localProgress, progRow as CloudProgressRow)
        if (validateLocalProgress(merged)) {
          saveLocalProgressDirectly(merged)

          // 检查本地是否有新数值云端尚未达到
          const cloudTotals = (progRow.totals as Record<string, unknown>) ?? {}
          const hasLocalNewerStats = Object.keys(merged.totals).some(k => {
            const mVal = (merged.totals as unknown as Record<string, unknown>)[k]
            const cVal = cloudTotals[k]
            return typeof mVal === 'number' && mVal > (typeof cVal === 'number' ? cVal : 0)
          })
          if (hasLocalNewerStats) {
            shouldPushProgress = true
          }
        }
      } else {
        shouldPushProgress = true
      }

      // 双向同步写入更新
      if (shouldPushSettings) {
        await syncEngine.pushSettings()
      }
      if (shouldPushProgress) {
        await syncEngine.pushProgress(loadLocalProgress())
      }

      return true
    })

    if (result) {
      syncStatus.value = 'success'
      const now = Date.now()
      lastSyncedAt.value = now
      saveLastSyncedAt(now)
      return true
    } else {
      syncStatus.value = isSupabaseConfigured ? 'error' : 'idle'
      return false
    }
  },

  /**
   * 推送全量设置（fire-and-forget）。
   */
  async pushSettings(customSettings?: CloudUserSettings): Promise<void> {
    await withUser(async userId => {
      const settings = customSettings ?? collectLocalSettings()
      await supabase
        .from('user_configs')
        .upsert(
          { user_id: userId, settings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    })
  },

  /**
   * 配置变更后调用（向后兼容）。
   */
  async pushConfig(settings: unknown): Promise<void> {
    await withUser(async userId => {
      await supabase
        .from('user_configs')
        .upsert(
          { user_id: userId, settings, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    })
  },

  /**
   * 进度变更后调用（fire-and-forget）。
   */
  async pushProgress(progress: unknown): Promise<void> {
    await withUser(async userId => {
      const p = progress as Partial<LocalProgress> | null
      await supabase.from('game_progress').upsert(
        {
          user_id: userId,
          totals: p?.totals ?? {},
          shame_records: p?.players ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    })
  },

  /**
   * 用户在界面主动触发即时双向同步。
   */
  async syncNow(): Promise<{ success: boolean; message?: string }> {
    if (!isSupabaseConfigured) {
      syncStatus.value = 'error'
      syncError.value = 'Supabase service is not configured'
      return { success: false, message: syncError.value }
    }
    const { currentUser } = useAuth()
    if (!currentUser.value) {
      syncStatus.value = 'error'
      syncError.value = 'Please log in to sync'
      return { success: false, message: syncError.value }
    }

    try {
      syncStatus.value = 'syncing'
      syncError.value = null
      const ok = await syncEngine.pullAndMerge()
      if (!ok) {
        throw new Error(syncError.value || 'Sync failed')
      }

      syncStatus.value = 'success'
      const now = Date.now()
      lastSyncedAt.value = now
      saveLastSyncedAt(now)
      return { success: true }
    } catch (err) {
      syncStatus.value = 'error'
      syncError.value = err instanceof Error ? err.message : String(err)
      return { success: false, message: syncError.value }
    }
  },
}
