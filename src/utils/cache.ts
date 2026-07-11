import type { BoardConfig, PunishmentConfig, TrapAction } from '../types/game'

// 缓存键名
export const GAME_CONFIG_STORAGE_KEY = 'ludo_game_config'
export const PLAYER_SETTINGS_STORAGE_KEY = 'ludo_player_settings'
export const CONFIG_BACKUP_STORAGE_KEY = 'flying-chess-config-backup'
export const LOCAL_GAME_STORAGE_KEYS = [
  GAME_CONFIG_STORAGE_KEY,
  PLAYER_SETTINGS_STORAGE_KEY,
  CONFIG_BACKUP_STORAGE_KEY,
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
export function saveConfig(data: Omit<CachedConfig, 'savedAt'>) {
  const payload: CachedConfig = { ...data, savedAt: Date.now() }
  try {
    localStorage.setItem(GAME_CONFIG_STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('保存配置到 localStorage 失败:', err)
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
    const cached: CachedConfig = JSON.parse(raw)
    if (Date.now() - cached.savedAt > ttl) {
      // 过期，清理
      localStorage.removeItem(GAME_CONFIG_STORAGE_KEY)
      return null
    }
    return cached
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

export function savePlayerSettings(settings: PlayerSettings) {
  try {
    localStorage.setItem(PLAYER_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('保存玩家设置失败:', err)
  }
}

export function loadPlayerSettings(): PlayerSettings | null {
  const raw = localStorage.getItem(PLAYER_SETTINGS_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PlayerSettings
  } catch (err) {
    console.warn('读取玩家设置失败:', err)
    return null
  }
}
