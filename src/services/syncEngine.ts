/**
 * Sync Engine — 本地优先 (Local-First) 云同步中间件
 *
 * 职责：
 *  - pullAndMerge()：用户登录后从云端拉取数据并合并到本地
 *  - pushConfig()  ：本地配置变更后异步推送到云端
 *  - pushProgress()：本地进度变更后异步推送到云端
 *
 * 设计原则：
 *  - 所有推送操作都是 fire-and-forget，绝不阻塞本地游戏逻辑
 *  - 仅在用户已登录时执行网络操作
 */
import { supabase } from './supabaseClient'
import { useAuth } from '../composables/useAuth'
import {
  loadConfig,
  saveConfig,
  loadLocalProgress,
} from '../utils/cache'
import { validateLocalProgress } from './localProgress'

// ================================================================
// 内部工具
// ================================================================

/** 仅在已登录时执行 fn，否则静默跳过 */
async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<T | null> {
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
// 合并策略：以「更新时间较新」为准，双方同时存在时提示用户
// ================================================================

function mergeProgress(local: any, cloud: any): any {
  if (!cloud) return local
  // 简单策略：取各项数值的最大值（本地 + 云端不会互相丢失）
  const totals: Record<string, any> = { ...local.totals }
  if (cloud.totals && typeof cloud.totals === 'object') {
    for (const key of Object.keys(cloud.totals)) {
      if (typeof cloud.totals[key] === 'number') {
        totals[key] = Math.max(totals[key] ?? 0, cloud.totals[key])
      } else if (key === 'variantCompletions' && typeof cloud.totals[key] === 'object') {
        const vc: Record<string, number> = { ...(totals.variantCompletions ?? {}) }
        for (const vk of Object.keys(cloud.totals[key])) {
          vc[vk] = Math.max(vc[vk] ?? 0, cloud.totals[key][vk] ?? 0)
        }
        totals.variantCompletions = vc
      }
    }
  }

  // 耻辱墙：合并两侧玩家记录，取各自最大值
  const players: Record<string, any> = { ...local.players }
  if (cloud.shame_records && typeof cloud.shame_records === 'object') {
    for (const [name, rec] of Object.entries(cloud.shame_records as Record<string, any>)) {
      if (!players[name]) {
        players[name] = rec
      } else {
        players[name] = {
          ...players[name],
          punishmentCount: Math.max(players[name].punishmentCount ?? 0, rec.punishmentCount ?? 0),
          mercyRequests: Math.max(players[name].mercyRequests ?? 0, rec.mercyRequests ?? 0),
        }
      }
    }
  }

  return { ...local, totals, players }
}

// ================================================================
// 公共 API
// ================================================================

export const syncEngine = {
  /**
   * 登录后调用：从云端拉取 user_configs 和 game_progress，
   * 并与本地数据合并写回 LocalStorage。
   */
  async pullAndMerge(): Promise<boolean> {
    const result = await withUser(async (userId) => {
      // — 拉取游戏配置 —
      const { data: cfgRow } = await supabase
        .from('user_configs')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle()

      if (cfgRow?.settings) {
        // 云端存在配置：只在本地没有配置时直接覆盖；
        // 若本地也有配置，保留本地（本地刚玩过的优先），
        // 云端配置在下次 push 时会被更新。
        const localCfg = loadConfig()
        if (!localCfg) {
          saveConfig(cfgRow.settings as any)
        }
      }

      // — 拉取进度 —
      const { data: progRow } = await supabase
        .from('game_progress')
        .select('totals, shame_records')
        .eq('user_id', userId)
        .maybeSingle()

      if (progRow) {
        const localProgress = loadLocalProgress()
        const merged = mergeProgress(localProgress, progRow)
        if (validateLocalProgress(merged)) {
          // 直接写 localStorage，避免触发 saveLocalProgress 的 push 钩子（防止循环）
          try {
            localStorage.setItem('flying-chess-local-progress-v1', JSON.stringify(merged))
          } catch { /* ignore */ }
        }
      }
      return true
    })
    return result ?? false
  },

  /**
   * 配置变更后调用（fire-and-forget）。
   * 仅在已登录时执行，网络失败静默忽略。
   */
  async pushConfig(settings: unknown): Promise<void> {
    await withUser(async (userId) => {
      await supabase.from('user_configs').upsert(
        { user_id: userId, settings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    })
  },

  /**
   * 进度变更后调用（fire-and-forget）。
   * 仅在已登录时执行，网络失败静默忽略。
   */
  async pushProgress(progress: unknown): Promise<void> {
    await withUser(async (userId) => {
      const p = progress as any
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
}
