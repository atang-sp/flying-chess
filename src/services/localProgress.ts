import type { PunishmentVariant, TrapVariant } from '../types/game'

export interface LocalProgressTotals {
  readonly completedGames: number
  readonly punishmentCount: number
  readonly mercyRequests: number
  readonly longestChain: number
  readonly variantCompletions: Readonly<Partial<Record<PunishmentVariant, number>>>
}

export interface LocalPlayerProgress {
  readonly playerName: string
  readonly punishmentCount: number
  readonly mercyRequests: number
}

export interface LocalProgress {
  readonly version: 1
  readonly totals: LocalProgressTotals
  readonly players: Readonly<Record<string, LocalPlayerProgress>>
}

export type LocalProgressEvent =
  | Readonly<{
      kind: 'punishment_completed'
      playerName: string
      count: number
      variant?: PunishmentVariant
    }>
  | Readonly<{ kind: 'mercy_requested'; playerName: string }>
  | Readonly<{ kind: 'chain_recorded'; length: number }>
  | Readonly<{ kind: 'game_completed' }>

export interface LocalAchievement {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly unlocked: boolean
}

export interface UnlockedPartyContent {
  readonly punishmentVariants: readonly PunishmentVariant[]
  readonly miniGameTraps: readonly TrapVariant[]
}

export function createLocalProgress(): LocalProgress {
  return Object.freeze({
    version: 1,
    totals: Object.freeze({
      completedGames: 0,
      punishmentCount: 0,
      mercyRequests: 0,
      longestChain: 0,
      variantCompletions: Object.freeze({}),
    }),
    players: Object.freeze({}),
  })
}

const normalizePlayerName = (value: string): string => value.trim().slice(0, 40) || '未命名玩家'

const updatePlayer = (
  players: LocalProgress['players'],
  playerName: string,
  patch: Partial<Pick<LocalPlayerProgress, 'punishmentCount' | 'mercyRequests'>>
): LocalProgress['players'] => {
  const normalizedName = normalizePlayerName(playerName)
  const current = players[normalizedName] ?? {
    playerName: normalizedName,
    punishmentCount: 0,
    mercyRequests: 0,
  }
  return Object.freeze({
    ...players,
    [normalizedName]: Object.freeze({
      ...current,
      punishmentCount: current.punishmentCount + (patch.punishmentCount ?? 0),
      mercyRequests: current.mercyRequests + (patch.mercyRequests ?? 0),
    }),
  })
}

export function recordLocalProgress(
  progress: LocalProgress,
  event: LocalProgressEvent
): LocalProgress {
  if (event.kind === 'game_completed') {
    return Object.freeze({
      ...progress,
      totals: Object.freeze({
        ...progress.totals,
        completedGames: progress.totals.completedGames + 1,
      }),
    })
  }
  if (event.kind === 'chain_recorded') {
    const length = Math.max(0, Math.trunc(event.length))
    return Object.freeze({
      ...progress,
      totals: Object.freeze({
        ...progress.totals,
        longestChain: Math.max(progress.totals.longestChain, length),
      }),
    })
  }
  if (event.kind === 'mercy_requested') {
    return Object.freeze({
      ...progress,
      totals: Object.freeze({
        ...progress.totals,
        mercyRequests: progress.totals.mercyRequests + 1,
      }),
      players: updatePlayer(progress.players, event.playerName, { mercyRequests: 1 }),
    })
  }

  if (!Number.isFinite(event.count) || event.count < 0) {
    throw new Error('累计受罚次数必须是非负数')
  }
  const count = Math.round(event.count)
  const variantCompletions = event.variant
    ? {
        ...progress.totals.variantCompletions,
        [event.variant]: (progress.totals.variantCompletions[event.variant] ?? 0) + 1,
      }
    : progress.totals.variantCompletions
  return Object.freeze({
    ...progress,
    totals: Object.freeze({
      ...progress.totals,
      punishmentCount: progress.totals.punishmentCount + count,
      variantCompletions: Object.freeze(variantCompletions),
    }),
    players: updatePlayer(progress.players, event.playerName, { punishmentCount: count }),
  })
}

export function getLocalAchievements(progress: LocalProgress): readonly LocalAchievement[] {
  const variantsSeen = Object.values(progress.totals.variantCompletions).filter(
    count => (count ?? 0) > 0
  ).length
  return Object.freeze([
    Object.freeze({
      id: 'first_game',
      title: '完成首航',
      description: '完整结束 1 局游戏',
      unlocked: progress.totals.completedGames >= 1,
    }),
    Object.freeze({
      id: 'endurance_30',
      title: '累计耐受',
      description: '累计完成 30 次惩罚',
      unlocked: progress.totals.punishmentCount >= 30,
    }),
    Object.freeze({
      id: 'mercy_five',
      title: '求饶专家',
      description: '累计发起 5 次求饶',
      unlocked: progress.totals.mercyRequests >= 5,
    }),
    Object.freeze({
      id: 'chain_three',
      title: '连锁飞行员',
      description: '单次连锁达到 3 层',
      unlocked: progress.totals.longestChain >= 3,
    }),
    Object.freeze({
      id: 'variant_collector',
      title: '命运收藏家',
      description: '完成 4 种不同惩罚变体',
      unlocked: variantsSeen >= 4,
    }),
  ])
}

export function getUnlockedPartyContent(progress: LocalProgress): UnlockedPartyContent {
  // party_v2 的四种核心变体始终可用；跨局进度额外解锁返场变体，避免削弱 A1 基线。
  const punishmentVariants: PunishmentVariant[] = ['blindbox', 'conditional', 'deferred', 'mutual']
  if (progress.totals.completedGames >= 2) punishmentVariants.push('encore')

  const miniGameTraps: TrapVariant[] = ['mini_game_reaction']
  if (progress.totals.completedGames >= 1) miniGameTraps.push('mini_game_memory')
  if (progress.totals.longestChain >= 3) miniGameTraps.push('mini_game_quiz')
  return Object.freeze({
    punishmentVariants: Object.freeze(punishmentVariants),
    miniGameTraps: Object.freeze(miniGameTraps),
  })
}

export function getShameWall(progress: LocalProgress): readonly LocalPlayerProgress[] {
  return Object.freeze(
    Object.values(progress.players).sort(
      (left, right) =>
        right.punishmentCount - left.punishmentCount ||
        right.mercyRequests - left.mercyRequests ||
        left.playerName.localeCompare(right.playerName)
    )
  )
}

const nonNegativeInteger = (value: unknown): boolean =>
  Number.isInteger(value) && Number(value) >= 0

export function validateLocalProgress(value: unknown): value is LocalProgress {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LocalProgress>
  if (candidate.version !== 1 || !candidate.totals || !candidate.players) return false
  if (
    !nonNegativeInteger(candidate.totals.completedGames) ||
    !nonNegativeInteger(candidate.totals.punishmentCount) ||
    !nonNegativeInteger(candidate.totals.mercyRequests) ||
    !nonNegativeInteger(candidate.totals.longestChain) ||
    !candidate.totals.variantCompletions ||
    typeof candidate.totals.variantCompletions !== 'object'
  ) {
    return false
  }
  return Object.values(candidate.players).every(
    player =>
      Boolean(player) &&
      typeof player.playerName === 'string' &&
      nonNegativeInteger(player.punishmentCount) &&
      nonNegativeInteger(player.mercyRequests)
  )
}
