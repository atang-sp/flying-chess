import { scopedStorage } from './scopedStorage'
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
import { watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import {
  accountEpoch,
  activeAccount,
  storageRevision,
  syncRequested,
  requestSync,
  readPending,
  acknowledgeSync,
  SETTINGS_UPDATED_KEY,
} from './syncRuntime'
import {
  loadReplica,
  saveReplica,
  mergeReplicas,
  replicaProgress,
  validateReplica,
  sameProgress,
  type ProgressReplica,
} from './progressReplica'
import { createLocalProgress } from './localProgress'
import { readGuestData } from './accountStorage'
import {
  validateBoardConfig,
  validatePunishmentConfig,
  validateTrapConfig,
} from '@flying-chess/game-core/config'
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
import type { VictoryConfig } from '@flying-chess/game-core/types'
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
    savedAt: Number(scopedStorage.getItem(SETTINGS_UPDATED_KEY)) || loadConfig()?.savedAt || 0,
  }
}

type Pending = ReturnType<typeof readPending>
let timer: ReturnType<typeof setTimeout> | null = null
let flight: Promise<boolean> | null = null
let retryDelay = 1000

function context() {
  const user = useAuth().currentUser.value
  if (!isSupabaseConfigured || !user || activeAccount.value !== user.id) return null
  const epoch = accountEpoch.value
  return {
    userId: user.id,
    assert() {
      if (accountEpoch.value !== epoch || useAuth().currentUser.value?.id !== user.id) {
        throw new Error('Account changed during sync')
      }
    },
    valid: () => accountEpoch.value === epoch && useAuth().currentUser.value?.id === user.id,
  }
}

function checkError(error: unknown): void {
  if (error) throw error
}

function validateSettings(raw: unknown): CloudUserSettings {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid cloud settings')
  const value = raw as CloudUserSettings & Partial<CachedConfig>
  const settings =
    value.gameConfig || !value.boardConfig ? value : { ...value, gameConfig: value as CachedConfig }
  if (settings.savedAt === undefined) settings.savedAt = 0
  if (!Number.isFinite(settings.savedAt) || settings.savedAt < 0)
    throw new Error('Invalid settings timestamp')
  const config = settings.gameConfig
  if (
    config &&
    (!validateBoardConfig(config.boardConfig) ||
      !validatePunishmentConfig(config.punishmentConfig) ||
      !validateTrapConfig(config.trapConfig))
  ) {
    throw new Error('Invalid cloud game configuration')
  }
  const players = settings.playerSettings
  if (
    players &&
    (!Number.isSafeInteger(players.playerCount) ||
      players.playerCount < 1 ||
      players.playerCount > 8 ||
      !Array.isArray(players.playerNames) ||
      players.playerNames.length !== players.playerCount ||
      players.playerNames.some(name => typeof name !== 'string'))
  ) {
    throw new Error('Invalid cloud players')
  }
  if (settings.partyEventDeck && !validatePartyEventDeck(settings.partyEventDeck).ok)
    throw new Error('Invalid cloud event deck')
  if (settings.partyStudioConfig && !validatePartyStudioConfig(settings.partyStudioConfig).ok)
    throw new Error('Invalid cloud studio')
  if (settings.gameMode && settings.gameMode !== 'classic' && settings.gameMode !== 'party')
    throw new Error('Invalid cloud mode')
  if (
    settings.locale &&
    !['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt', 'it'].includes(settings.locale)
  )
    throw new Error('Invalid cloud locale')
  return settings
}

function applySettings(settings: CloudUserSettings): void {
  if (
    settings.gameConfig &&
    !saveConfigDirectly({
      ...settings.gameConfig,
      savedAt: Math.max(settings.savedAt, settings.gameConfig.savedAt || 0),
    })
  )
    throw new Error('Could not save cloud configuration')
  if (settings.playerSettings) savePlayerSettingsDirectly(settings.playerSettings)
  if (settings.victoryConfig) saveVictoryConfigDirectly(settings.victoryConfig)
  if (settings.partyEventDeck && !savePartyEventDeckDirectly(settings.partyEventDeck))
    throw new Error('Could not save cloud event deck')
  if (settings.partyStudioConfig && !savePartyStudioConfigDirectly(settings.partyStudioConfig))
    throw new Error('Could not save cloud studio')
  if (settings.gameMode) saveGameModeDirectly(settings.gameMode)
  if (settings.locale) saveLocalePreferenceDirectly(settings.locale)
  scopedStorage.setItem(SETTINGS_UPDATED_KEY, String(settings.savedAt))
}

// Compare-and-set uses the server timestamp returned by SELECT. Concurrent writers retry
// against the winning row instead of unconditionally replacing it.
async function writeRow(
  table: 'user_configs' | 'game_progress',
  userId: string,
  row: Record<string, unknown>,
  updatedAt: string | null
): Promise<boolean> {
  if (updatedAt === null) {
    const { error } = await supabase.from(table).insert({ user_id: userId, ...row })
    if (error?.code === '23505') return false
    checkError(error)
    return true
  }
  const { data, error } = await supabase
    .from(table)
    .update(row)
    .eq('user_id', userId)
    .eq('updated_at', updatedAt)
    .select('updated_at')
    .maybeSingle()
  checkError(error)
  return Boolean(data)
}

async function syncSettings(ctx: NonNullable<ReturnType<typeof context>>): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    ctx.assert()
    const { data, error } = await supabase
      .from('user_configs')
      .select('settings, updated_at')
      .eq('user_id', ctx.userId)
      .maybeSingle()
    ctx.assert()
    checkError(error)
    const pending = readPending().settings
    const local = collectLocalSettings()
    const cloud = data ? validateSettings(data.settings) : null
    if (cloud && (!pending || cloud.savedAt > local.savedAt)) {
      applySettings(cloud)
      if (pending) acknowledgeSync('settings', pending)
      return
    }
    if (!pending && cloud) return
    const written = await writeRow(
      'user_configs',
      ctx.userId,
      { settings: local },
      data?.updated_at ?? null
    )
    ctx.assert()
    if (written) {
      if (pending) acknowledgeSync('settings', pending)
      return
    }
  }
  throw new Error('Settings changed concurrently; retrying')
}

function cloudReplica(row: CloudProgressRow | null, local: ProgressReplica): ProgressReplica {
  if (!row) return { version: 2, baseline: createLocalProgress(), devices: {} }
  const metadata = row.totals?.__replica
  if (metadata !== undefined) {
    if (!validateReplica(metadata)) throw new Error('Invalid cloud progress replica')
    const expected = replicaProgress(metadata)
    const stored = mergeProgress(createLocalProgress(), row)
    if (!sameProgress(expected, stored))
      throw new Error('Cloud progress metadata does not match its snapshot')
    return metadata
  }
  // Legacy snapshots predate per-device counters. Preserve their maximum baseline.
  const legacy = mergeProgress(createLocalProgress(), row)
  if (!validateLocalProgress(legacy)) throw new Error('Invalid cloud progress')
  const known = replicaProgress(local)
  if (sameProgress(legacy, known)) return local
  if (Object.keys(local.devices).length > 0) {
    throw new Error('Legacy progress snapshot detected; update all devices before synchronizing')
  }
  return { version: 2, baseline: legacy, devices: {} }
}

async function syncProgress(ctx: NonNullable<ReturnType<typeof context>>): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    ctx.assert()
    const { data, error } = await supabase
      .from('game_progress')
      .select('totals, shame_records, updated_at')
      .eq('user_id', ctx.userId)
      .maybeSingle()
    ctx.assert()
    checkError(error)
    const pending = readPending().progress
    const local = loadReplica(loadLocalProgress())
    const merged = mergeReplicas(local, cloudReplica(data, local))
    const progress = replicaProgress(merged)
    if (!validateLocalProgress(progress)) throw new Error('Invalid merged progress')
    const written = await writeRow(
      'game_progress',
      ctx.userId,
      {
        totals: { ...progress.totals, __replica: merged },
        shame_records: progress.players,
      },
      data?.updated_at ?? null
    )
    ctx.assert()
    if (!written) continue
    // Events recorded while the request was in flight remain pending and are not overwritten.
    const latest = mergeReplicas(merged, loadReplica(loadLocalProgress()))
    saveReplica(latest)
    if (!saveLocalProgressDirectly(replicaProgress(latest)))
      throw new Error('Could not save merged progress')
    if (pending) acknowledgeSync('progress', pending)
    return
  }
  throw new Error('Progress changed concurrently; retrying')
}

function schedule(delay = 800): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void syncEngine.pullAndMerge()
  }, delay)
}

export function pushSettingsDebounced(delay = 800): void {
  requestSync('settings')
  schedule(delay)
}

watch(
  syncRequested,
  () => {
    if (!context()) return
    syncStatus.value = 'idle'
    schedule()
  },
  { flush: 'sync' }
)
watch(
  accountEpoch,
  () => {
    if (timer) clearTimeout(timer)
    timer = null
    retryDelay = 1000
  },
  { flush: 'sync' }
)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => schedule(0))
  window.addEventListener('focus', () => schedule(0))
}

export const syncEngine = {
  async pullAndMerge(): Promise<boolean> {
    if (flight) {
      await flight
      return syncEngine.pullAndMerge()
    }
    const ctx = context()
    if (!ctx) return false
    syncStatus.value = 'syncing'
    syncError.value = null
    flight = (async () => {
      try {
        await syncSettings(ctx)
        await syncProgress(ctx)
        ctx.assert()
        storageRevision.value++
        const pending: Pending = readPending()
        if (pending.settings || pending.progress) {
          syncStatus.value = 'idle'
          schedule(0)
          return false
        }
        const now = Date.now()
        saveLastSyncedAt(now)
        lastSyncedAt.value = now
        syncStatus.value = 'success'
        retryDelay = 1000
        return true
      } catch (error) {
        if (ctx.valid()) {
          syncStatus.value = 'error'
          syncError.value =
            error instanceof Error
              ? error.message
              : (error as { message?: string })?.message || 'Sync failed'
          schedule(retryDelay)
          retryDelay = Math.min(30_000, retryDelay * 2)
        }
        return false
      }
    })()
    try {
      return await flight
    } finally {
      flight = null
    }
  },
  async pushSettings(): Promise<void> {
    requestSync('settings')
    await syncEngine.pullAndMerge()
  },
  async pushConfig(): Promise<void> {
    await syncEngine.pushSettings()
  },
  async pushProgress(): Promise<void> {
    requestSync('progress')
    await syncEngine.pullAndMerge()
  },
  async syncNow(): Promise<{ success: boolean; message?: string }> {
    if (!context()) return { success: false, message: 'Please log in to sync' }
    const success = await syncEngine.pullAndMerge()
    return {
      success,
      message: success ? undefined : syncError.value || 'Changes are still pending',
    }
  },
  async importGuestData(): Promise<void> {
    if (!context()) throw new Error('Please log in first')
    const guest = readGuestData()
    const rawProgress = guest['flying-chess-local-progress-v1']
    if (rawProgress) {
      const progress: unknown = JSON.parse(rawProgress)
      if (!validateLocalProgress(progress)) throw new Error('Invalid guest progress')
      const local = loadReplica(loadLocalProgress())
      const merged = mergeReplicas(local, { version: 2, baseline: progress, devices: {} })
      saveReplica(merged)
      if (!saveLocalProgressDirectly(replicaProgress(merged)))
        throw new Error('Could not import progress')
      requestSync('progress')
    }
    // Explicit import replaces the account's settings, retaining the guest backup.
    const guestKeys = [
      'ludo_game_config',
      'ludo_player_settings',
      'flying-chess-game-mode',
      'flying-chess-victory-config',
      'flying-chess-party-event-deck',
      'flying-chess-party-studio-v1',
      'flying-chess-locale',
    ]
    for (const key of guestKeys) {
      if (guest[key]) scopedStorage.setItem(key, guest[key])
    }
    requestSync('settings')
    storageRevision.value++
    await syncEngine.pullAndMerge()
  },
}
