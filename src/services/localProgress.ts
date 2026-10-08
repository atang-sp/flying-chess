import type { PunishmentVariant, TrapVariant } from '@flying-chess/game-core/types'

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
  readonly progress?: number
  readonly maxProgress?: number
  readonly isHidden?: boolean
  readonly rarity?: 'common' | 'rare' | 'epic'
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
      title: 'achievement_first_game_title',
      description: 'achievement_first_game_desc',
      unlocked: progress.totals.completedGames >= 1,
      progress: Math.min(progress.totals.completedGames, 1),
      maxProgress: 1,
      rarity: 'common',
    }),
    Object.freeze({
      id: 'regular_customer',
      title: 'achievement_regular_customer_title',
      description: 'achievement_regular_customer_desc',
      unlocked: progress.totals.completedGames >= 5,
      progress: Math.min(progress.totals.completedGames, 5),
      maxProgress: 5,
      rarity: 'rare',
    }),
    Object.freeze({
      id: 'veteran_10',
      title: 'achievement_veteran_10_title',
      description: 'achievement_veteran_10_desc',
      unlocked: progress.totals.completedGames >= 10,
      progress: Math.min(progress.totals.completedGames, 10),
      maxProgress: 10,
      rarity: 'rare',
    }),
    Object.freeze({
      id: 'addicted',
      title: 'achievement_addicted_title',
      description: 'achievement_addicted_desc',
      unlocked: progress.totals.completedGames >= 20,
      progress: Math.min(progress.totals.completedGames, 20),
      maxProgress: 20,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'veteran_50',
      title: 'achievement_veteran_50_title',
      description: 'achievement_veteran_50_desc',
      unlocked: progress.totals.completedGames >= 50,
      progress: Math.min(progress.totals.completedGames, 50),
      maxProgress: 50,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'endurance_30',
      title: 'achievement_endurance_title',
      description: 'achievement_endurance_desc',
      unlocked: progress.totals.punishmentCount >= 30,
      progress: Math.min(progress.totals.punishmentCount, 30),
      maxProgress: 30,
      rarity: 'rare',
    }),
    Object.freeze({
      id: 'endurance_100',
      title: 'achievement_endurance_100_title',
      description: 'achievement_endurance_100_desc',
      unlocked: progress.totals.punishmentCount >= 100,
      progress: Math.min(progress.totals.punishmentCount, 100),
      maxProgress: 100,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'endurance_500',
      title: 'achievement_endurance_500_title',
      description: 'achievement_endurance_500_desc',
      unlocked: progress.totals.punishmentCount >= 500,
      progress: Math.min(progress.totals.punishmentCount, 500),
      maxProgress: 500,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'mercy_five',
      title: 'achievement_mercy_expert_title',
      description: 'achievement_mercy_expert_desc',
      unlocked: progress.totals.mercyRequests >= 5,
      progress: Math.min(progress.totals.mercyRequests, 5),
      maxProgress: 5,
      rarity: 'common',
    }),
    Object.freeze({
      id: 'mercy_fifty',
      title: 'achievement_mercy_fifty_title',
      description: 'achievement_mercy_fifty_desc',
      unlocked: progress.totals.mercyRequests >= 50,
      progress: Math.min(progress.totals.mercyRequests, 50),
      maxProgress: 50,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'chain_three',
      title: 'achievement_chain_pilot_title',
      description: 'achievement_chain_pilot_desc',
      unlocked: progress.totals.longestChain >= 3,
      progress: Math.min(progress.totals.longestChain, 3),
      maxProgress: 3,
      rarity: 'rare',
    }),
    Object.freeze({
      id: 'chain_five',
      title: 'achievement_chain_five_title',
      description: 'achievement_chain_five_desc',
      unlocked: progress.totals.longestChain >= 5,
      progress: Math.min(progress.totals.longestChain, 5),
      maxProgress: 5,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'chain_seven',
      title: 'achievement_chain_seven_title',
      description: 'achievement_chain_seven_desc',
      unlocked: progress.totals.longestChain >= 7,
      progress: Math.min(progress.totals.longestChain, 7),
      maxProgress: 7,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'variant_collector',
      title: 'achievement_fate_collector_title',
      description: 'achievement_fate_collector_desc',
      unlocked: variantsSeen >= 4,
      progress: Math.min(variantsSeen, 4),
      maxProgress: 4,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'all_variants',
      title: 'achievement_all_variants_title',
      description: 'achievement_all_variants_desc',
      unlocked: variantsSeen >= 5,
      progress: Math.min(variantsSeen, 5),
      maxProgress: 5,
      rarity: 'epic',
    }),
    Object.freeze({
      id: 'unlucky',
      title: 'achievement_unlucky_title',
      description: 'achievement_unlucky_desc',
      unlocked: progress.totals.punishmentCount >= 50,
      isHidden: true,
      rarity: 'epic',
    }),
  ])
}

export function getUnlockedPartyContent(progress: LocalProgress): UnlockedPartyContent {
  // Party 的四种核心变体始终可用；跨局进度额外解锁返场变体，避免削弱既有基线。
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
  Number.isSafeInteger(value) && Number(value) >= 0

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
    typeof candidate.totals.variantCompletions !== 'object' ||
    Array.isArray(candidate.totals.variantCompletions) ||
    !Object.values(candidate.totals.variantCompletions).every(nonNegativeInteger) ||
    typeof candidate.players !== 'object' ||
    Array.isArray(candidate.players)
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
