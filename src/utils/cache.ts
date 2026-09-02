import type {
  BoardConfig,
  PunishmentConfig,
  TrapAction,
  VictoryConfig,
} from '@flying-chess/game-core/types'
import {
  DEFAULT_GAME_MODE,
  GAME_MODES,
  RULESET_VERSION_BY_MODE,
  type GameMode,
} from '../config/modes'
import { normalizeVictoryConfig } from '@flying-chess/game-core/victory-settlement'
import {
  normalizeConfigSnapshot,
  validateBoardConfig,
  validatePunishmentConfig,
  validateTrapConfig,
} from '@flying-chess/game-core/config'
import {
  DEFAULT_PARTY_EVENT_DECK,
  validatePartyEventDeck,
  type PartyEventCard,
} from '@flying-chess/game-core/party-events'
import {
  createLocalProgress,
  validateLocalProgress,
  type LocalProgress,
} from '../services/localProgress'
import {
  DEFAULT_PARTY_STUDIO_CONFIG,
  validatePartyStudioConfig,
  type PartyStudioConfig,
} from '../services/partyStudio'

// 缓存键名
export const GAME_CONFIG_STORAGE_KEY = 'ludo_game_config'
export const PLAYER_SETTINGS_STORAGE_KEY = 'ludo_player_settings'
export const CONFIG_BACKUP_STORAGE_KEY = 'flying-chess-config-backup'
export const GAME_MODE_STORAGE_KEY = 'flying-chess-game-mode'
export const VICTORY_CONFIG_STORAGE_KEY = 'flying-chess-victory-config'
export const PARTY_EVENT_DECK_STORAGE_KEY = 'flying-chess-party-event-deck'
export const LOCAL_PROGRESS_STORAGE_KEY = 'flying-chess-local-progress-v1'
export const PARTY_STUDIO_STORAGE_KEY = 'flying-chess-party-studio-v1'
export const LOCAL_GAME_STORAGE_KEYS = [
  GAME_CONFIG_STORAGE_KEY,
  PLAYER_SETTINGS_STORAGE_KEY,
  CONFIG_BACKUP_STORAGE_KEY,
  GAME_MODE_STORAGE_KEY,
  VICTORY_CONFIG_STORAGE_KEY,
  PARTY_EVENT_DECK_STORAGE_KEY,
  LOCAL_PROGRESS_STORAGE_KEY,
  PARTY_STUDIO_STORAGE_KEY,
  'hasShownGuide',
  'autoGuideEnabled',
] as const
// 12 个月有效期（毫秒）
const DEFAULT_TTL = 1000 * 60 * 60 * 24 * 365

export interface CachedConfig {
  boardConfig: BoardConfig
  punishmentConfig: PunishmentConfig
  trapConfig: TrapAction[]
  savedAt: number // 时间戳
}

/**
 * 保存配置到 localStorage
 */
export function saveConfig(data: Omit<CachedConfig, 'savedAt'>): boolean {
  if (
    !validateBoardConfig(data.boardConfig) ||
    !validatePunishmentConfig(data.punishmentConfig) ||
    !validateTrapConfig(data.trapConfig)
  ) {
    return false
  }
  const normalized = normalizeConfigSnapshot({
    boardConfig: data.boardConfig,
    punishmentConfig: data.punishmentConfig,
    trapConfig: data.trapConfig,
  })
  const payload: CachedConfig = {
    boardConfig: normalized.boardConfig,
    punishmentConfig: normalized.punishmentConfig,
    trapConfig: normalized.traps,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(GAME_CONFIG_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch (err) {
    console.warn('保存配置到 localStorage 失败:', err)
    return false
  }
}

/**
 * 读取配置
 * @param ttl 过期时间，默认 12 个月
 * @returns 配置或 null
 */
export function loadConfig(ttl: number = DEFAULT_TTL): CachedConfig | null {
  const raw = localStorage.getItem(GAME_CONFIG_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      typeof (parsed as Record<string, unknown>).savedAt !== 'number' ||
      !Number.isFinite((parsed as Record<string, unknown>).savedAt)
    ) {
      return null
    }
    const cached = parsed as CachedConfig
    if (Date.now() - cached.savedAt > ttl) {
      // 过期，清理
      localStorage.removeItem(GAME_CONFIG_STORAGE_KEY)
      return null
    }
    const normalized = normalizeConfigSnapshot(cached)
    const defaults = normalizeConfigSnapshot(undefined)
    return {
      boardConfig: validateBoardConfig(normalized.boardConfig)
        ? normalized.boardConfig
        : defaults.boardConfig,
      punishmentConfig: validatePunishmentConfig(normalized.punishmentConfig)
        ? normalized.punishmentConfig
        : defaults.punishmentConfig,
      trapConfig: validateTrapConfig(cached.trapConfig) ? normalized.traps : defaults.traps,
      savedAt: cached.savedAt,
    }
  } catch (err) {
    console.warn('读取缓存配置失败:', err)
    return null
  }
}

/**
 * 清除本地缓存配置
 */
export function clearConfig() {
  localStorage.removeItem(GAME_CONFIG_STORAGE_KEY)
}

export function clearAllLocalGameData(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  LOCAL_GAME_STORAGE_KEYS.forEach(key => storage.removeItem(key))
}

// ================= 玩家设置缓存 =================

export interface PlayerSettings {
  playerCount: number
  playerNames: string[]
}

type PlayerSettingsStorageReader = Pick<Storage, 'getItem'>

export function savePlayerSettings(settings: PlayerSettings) {
  try {
    localStorage.setItem(PLAYER_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('保存玩家设置失败:', err)
  }
}

export function loadPlayerSettings(
  storage: PlayerSettingsStorageReader = localStorage
): PlayerSettings | null {
  const raw = storage.getItem(PLAYER_SETTINGS_STORAGE_KEY)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const candidate = value as Record<string, unknown>
    if (
      !Number.isSafeInteger(candidate.playerCount) ||
      Number(candidate.playerCount) < 1 ||
      !Array.isArray(candidate.playerNames) ||
      candidate.playerNames.length !== candidate.playerCount ||
      candidate.playerNames.some(name => typeof name !== 'string')
    ) {
      return null
    }
    return {
      playerCount: Number(candidate.playerCount),
      playerNames: [...candidate.playerNames],
    }
  } catch (err) {
    console.warn('读取玩家设置失败:', err)
    return null
  }
}

type GameModeStorageReader = Pick<Storage, 'getItem'>
type GameModeStorageWriter = Pick<Storage, 'setItem'>

export function loadGameMode(storage: GameModeStorageReader = localStorage): GameMode {
  const raw = storage.getItem(GAME_MODE_STORAGE_KEY)
  if (!raw) return DEFAULT_GAME_MODE

  // classic_v1 从未改变，旧的纯字符串缓存可安全保留；旧 party 缓存没有
  // 规则集版本，必须回退并让玩家重新显式选择，避免静默升级到 party_v3。
  if (raw === 'classic') return 'classic'
  try {
    const stored: unknown = JSON.parse(raw)
    if (!stored || typeof stored !== 'object') return DEFAULT_GAME_MODE
    const candidate = stored as Record<string, unknown>
    if (!GAME_MODES.includes(candidate.mode as GameMode)) return DEFAULT_GAME_MODE
    const mode = candidate.mode as GameMode
    return candidate.rulesetVersion === RULESET_VERSION_BY_MODE[mode] ? mode : DEFAULT_GAME_MODE
  } catch {
    return DEFAULT_GAME_MODE
  }
}

export function saveGameMode(mode: GameMode, storage: GameModeStorageWriter = localStorage): void {
  try {
    storage.setItem(
      GAME_MODE_STORAGE_KEY,
      JSON.stringify({ mode, rulesetVersion: RULESET_VERSION_BY_MODE[mode] })
    )
  } catch (error) {
    console.warn('保存本局玩法失败:', error)
  }
}

type VictoryConfigStorageReader = Pick<Storage, 'getItem'>
type VictoryConfigStorageWriter = Pick<Storage, 'setItem'>

export function loadVictoryConfig(
  storage: VictoryConfigStorageReader = localStorage
): VictoryConfig {
  const raw = storage.getItem(VICTORY_CONFIG_STORAGE_KEY)
  if (!raw) return normalizeVictoryConfig(undefined)
  try {
    return normalizeVictoryConfig(JSON.parse(raw))
  } catch {
    return normalizeVictoryConfig(undefined)
  }
}

export function saveVictoryConfig(
  config: VictoryConfig,
  storage: VictoryConfigStorageWriter = localStorage
): void {
  try {
    storage.setItem(VICTORY_CONFIG_STORAGE_KEY, JSON.stringify(normalizeVictoryConfig(config)))
  } catch (error) {
    console.warn('保存终局奖惩配置失败:', error)
  }
}

type PartyEventDeckStorageReader = Pick<Storage, 'getItem'>
type PartyEventDeckStorageWriter = Pick<Storage, 'setItem'>

export function loadPartyEventDeck(
  storage: PartyEventDeckStorageReader = localStorage
): readonly PartyEventCard[] {
  const raw = storage.getItem(PARTY_EVENT_DECK_STORAGE_KEY)
  if (!raw) return DEFAULT_PARTY_EVENT_DECK
  try {
    const parsed: unknown = JSON.parse(raw)
    return validatePartyEventDeck(parsed).ok
      ? (parsed as readonly PartyEventCard[])
      : DEFAULT_PARTY_EVENT_DECK
  } catch {
    return DEFAULT_PARTY_EVENT_DECK
  }
}

export function savePartyEventDeck(
  deck: readonly PartyEventCard[],
  storage: PartyEventDeckStorageWriter = localStorage
): boolean {
  if (!validatePartyEventDeck(deck).ok) return false
  try {
    storage.setItem(PARTY_EVENT_DECK_STORAGE_KEY, JSON.stringify(deck))
    return true
  } catch (error) {
    console.warn('保存升温局事件卡包失败:', error)
    return false
  }
}

type LocalProgressStorageReader = Pick<Storage, 'getItem'>
type LocalProgressStorageWriter = Pick<Storage, 'setItem'>

export function loadLocalProgress(
  storage: LocalProgressStorageReader = localStorage
): LocalProgress {
  const raw = storage.getItem(LOCAL_PROGRESS_STORAGE_KEY)
  if (!raw) return createLocalProgress()
  try {
    const parsed: unknown = JSON.parse(raw)
    return validateLocalProgress(parsed) ? parsed : createLocalProgress()
  } catch {
    return createLocalProgress()
  }
}

export function saveLocalProgress(
  progress: LocalProgress,
  storage: LocalProgressStorageWriter = localStorage
): boolean {
  if (!validateLocalProgress(progress)) return false
  try {
    storage.setItem(LOCAL_PROGRESS_STORAGE_KEY, JSON.stringify(progress))
    return true
  } catch (error) {
    console.warn('保存本地成就进度失败:', error)
    return false
  }
}

type PartyStudioStorageReader = Pick<Storage, 'getItem'>
type PartyStudioStorageWriter = Pick<Storage, 'setItem'>

export function loadPartyStudioConfig(
  storage: PartyStudioStorageReader = localStorage
): PartyStudioConfig {
  const raw = storage.getItem(PARTY_STUDIO_STORAGE_KEY)
  if (!raw) return structuredClone(DEFAULT_PARTY_STUDIO_CONFIG)
  try {
    const parsed: unknown = JSON.parse(raw)
    return validatePartyStudioConfig(parsed).ok
      ? (parsed as PartyStudioConfig)
      : structuredClone(DEFAULT_PARTY_STUDIO_CONFIG)
  } catch {
    return structuredClone(DEFAULT_PARTY_STUDIO_CONFIG)
  }
}

export function savePartyStudioConfig(
  config: PartyStudioConfig,
  storage: PartyStudioStorageWriter = localStorage
): boolean {
  if (!validatePartyStudioConfig(config).ok) return false
  try {
    storage.setItem(PARTY_STUDIO_STORAGE_KEY, JSON.stringify(config))
    return true
  } catch (error) {
    console.warn('保存 Party Studio 场景失败:', error)
    return false
  }
}
