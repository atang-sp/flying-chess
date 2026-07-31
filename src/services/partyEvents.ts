import type { ResolvedPunishmentResult } from '../types/game'
import { scaleResolvedPunishmentCount } from './ruleResolution'

export type PartyEventTrigger =
  | Readonly<{ kind: 'every_n_turns'; interval: number }>
  | Readonly<{ kind: 'consecutive_punishments'; count: number }>
  | Readonly<{ kind: 'dice_value'; value: number }>

export type PartyMiniGameKind = 'reaction' | 'memory' | 'quick_quiz'
export type PartyRockPaperScissorsChoice = 'rock' | 'paper' | 'scissors'

export type PartyEventEffect =
  | Readonly<{ kind: 'punishment_multiplier'; multiplier: number; durationTurns: number }>
  | Readonly<{ kind: 'mini_game'; game: PartyMiniGameKind }>
  | Readonly<{ kind: 'vote'; prompt: string; options: readonly string[] }>
  | Readonly<{ kind: 'rock_paper_scissors' }>
  | Readonly<{ kind: 'bind_players'; durationTurns: number }>

export interface PartyEventCard {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tags: readonly string[]
  readonly trigger: PartyEventTrigger
  readonly effect: PartyEventEffect
}

export interface ActivePartyPunishmentMultiplier {
  readonly multiplier: number
  readonly remainingTurns: number
}

export interface ActivePartyBinding {
  readonly playerIndices: readonly [number, number]
  readonly remainingTurns: number
}

export interface PartyEventState {
  readonly deck: readonly PartyEventCard[]
  readonly completedTurns: number
  readonly consecutivePunishments: number
  readonly triggerKeys: readonly string[]
  readonly activePunishmentMultiplier?: ActivePartyPunishmentMultiplier
  readonly activeBinding?: ActivePartyBinding
}

export type PartyEventSignal =
  | Readonly<{ kind: 'turn_completed'; hadPunishment: boolean }>
  | Readonly<{ kind: 'punishment_resolved' }>
  | Readonly<{ kind: 'dice_value'; value: number }>

export interface PartyEventSignalResult {
  readonly state: PartyEventState
  readonly drawnCard?: PartyEventCard
}

export interface PartyEventDeckValidation {
  readonly ok: boolean
  readonly error?: string
}

export const DEFAULT_PARTY_EVENT_DECK: readonly PartyEventCard[] = Object.freeze([
  Object.freeze({
    id: 'all-in-double',
    title: '全员加码',
    description: '接下来 3 回合，所有惩罚次数翻倍。',
    tags: Object.freeze(['加码', '全员']),
    trigger: Object.freeze({ kind: 'every_n_turns', interval: 2 }),
    effect: Object.freeze({ kind: 'punishment_multiplier', multiplier: 2, durationTurns: 3 }),
  }),
  Object.freeze({
    id: 'lucky-six-reaction',
    title: '六点急袭',
    description: '掷出 6 点触发反应速度挑战，最快者获胜。',
    tags: Object.freeze(['小游戏', '反应']),
    trigger: Object.freeze({ kind: 'dice_value', value: 6 }),
    effect: Object.freeze({ kind: 'mini_game', game: 'reaction' }),
  }),
  Object.freeze({
    id: 'streak-memory',
    title: '连续中招',
    description: '连续出现两次惩罚后，开始一轮记忆翻牌。',
    tags: Object.freeze(['小游戏', '记忆']),
    trigger: Object.freeze({ kind: 'consecutive_punishments', count: 2 }),
    effect: Object.freeze({ kind: 'mini_game', game: 'memory' }),
  }),
  Object.freeze({
    id: 'fate-vote',
    title: '命运投票',
    description: '全员公开投票决定下一轮气氛。',
    tags: Object.freeze(['投票', '全员']),
    trigger: Object.freeze({ kind: 'every_n_turns', interval: 3 }),
    effect: Object.freeze({
      kind: 'vote',
      prompt: '下一轮应该更偏向哪种气氛？',
      options: Object.freeze(['轻松破冰', '刺激加码']),
    }),
  }),
  Object.freeze({
    id: 'binding-fate',
    title: '命运绑定',
    description: '选择两名玩家，接下来 3 回合共同承担彼此触发的惩罚。',
    tags: Object.freeze(['关系', '绑定']),
    trigger: Object.freeze({ kind: 'every_n_turns', interval: 4 }),
    effect: Object.freeze({ kind: 'bind_players', durationTurns: 3 }),
  }),
  Object.freeze({
    id: 'all-player-rps',
    title: '全员猜拳',
    description: '所有玩家依次秘密出拳，最后统一揭晓赢家。',
    tags: Object.freeze(['猜拳', '全员']),
    trigger: Object.freeze({ kind: 'every_n_turns', interval: 5 }),
    effect: Object.freeze({ kind: 'rock_paper_scissors' }),
  }),
])

export function tallyPartyVotes(
  options: readonly string[],
  votes: readonly number[]
): { readonly counts: readonly number[]; readonly winningOptionIndices: readonly number[] } {
  if (
    options.length < 2 ||
    votes.some(vote => !Number.isInteger(vote) || vote < 0 || vote >= options.length)
  ) {
    throw new Error('投票内容或选项无效')
  }
  const counts = options.map((_, optionIndex) => votes.filter(vote => vote === optionIndex).length)
  const maximum = Math.max(...counts)
  return Object.freeze({
    counts: Object.freeze(counts),
    winningOptionIndices: Object.freeze(
      counts.flatMap((count, optionIndex) => (count === maximum ? [optionIndex] : []))
    ),
  })
}

export function resolvePartyRockPaperScissors(choices: readonly PartyRockPaperScissorsChoice[]): {
  readonly winnerPlayerIndices: readonly number[]
  readonly winningChoice: PartyRockPaperScissorsChoice | null
} {
  if (
    choices.length < 2 ||
    choices.some(choice => !['rock', 'paper', 'scissors'].includes(choice))
  ) {
    throw new Error('猜拳至少需要两名玩家的合法选择')
  }
  const unique = new Set(choices)
  if (unique.size !== 2) {
    return Object.freeze({
      winnerPlayerIndices: Object.freeze(choices.map((_, index) => index)),
      winningChoice: null,
    })
  }
  const beats: Readonly<Record<PartyRockPaperScissorsChoice, PartyRockPaperScissorsChoice>> = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper',
  }
  const [first, second] = [...unique] as PartyRockPaperScissorsChoice[]
  const winningChoice = beats[first] === second ? first : second
  return Object.freeze({
    winnerPlayerIndices: Object.freeze(
      choices.flatMap((choice, index) => (choice === winningChoice ? [index] : []))
    ),
    winningChoice,
  })
}

const freezeState = (state: PartyEventState): PartyEventState =>
  Object.freeze({
    ...state,
    deck: Object.freeze([...state.deck]),
    triggerKeys: Object.freeze([...state.triggerKeys]),
    activePunishmentMultiplier: state.activePunishmentMultiplier
      ? Object.freeze({ ...state.activePunishmentMultiplier })
      : undefined,
    activeBinding: state.activeBinding
      ? Object.freeze({
          ...state.activeBinding,
          playerIndices: Object.freeze([...state.activeBinding.playerIndices]) as readonly [
            number,
            number,
          ],
        })
      : undefined,
  })

export function createPartyEventState(
  deck: readonly PartyEventCard[] = DEFAULT_PARTY_EVENT_DECK
): PartyEventState {
  const validation = validatePartyEventDeck(deck)
  if (!validation.ok) throw new Error(validation.error ?? '事件卡包无效')
  return freezeState({
    deck,
    completedTurns: 0,
    consecutivePunishments: 0,
    triggerKeys: [],
  })
}

const decrementRuleDuration = <T extends { readonly remainingTurns: number }>(
  rule: T | undefined
): T | undefined => {
  if (!rule || rule.remainingTurns <= 1) return undefined
  return Object.freeze({ ...rule, remainingTurns: rule.remainingTurns - 1 })
}

const triggerKeyFor = (card: PartyEventCard, state: PartyEventState): string => {
  switch (card.trigger.kind) {
    case 'dice_value':
      return `${card.id}:dice:${state.completedTurns}`
    case 'consecutive_punishments':
      return `${card.id}:streak:${state.completedTurns}:${state.consecutivePunishments}`
    default:
      return `${card.id}:turn:${state.completedTurns}`
  }
}

const matchesSignal = (
  card: PartyEventCard,
  state: PartyEventState,
  signal: PartyEventSignal
): boolean => {
  if (signal.kind === 'turn_completed' && card.trigger.kind === 'every_n_turns') {
    return state.completedTurns > 0 && state.completedTurns % card.trigger.interval === 0
  }
  if (signal.kind === 'punishment_resolved' && card.trigger.kind === 'consecutive_punishments') {
    return state.consecutivePunishments >= card.trigger.count
  }
  return (
    signal.kind === 'dice_value' &&
    card.trigger.kind === 'dice_value' &&
    signal.value === card.trigger.value
  )
}

export function processPartyEventSignal(
  state: PartyEventState,
  signal: PartyEventSignal,
  chooseCard: (cards: readonly PartyEventCard[]) => PartyEventCard = cards => cards[0]
): PartyEventSignalResult {
  let nextState = freezeState({
    ...state,
    completedTurns:
      signal.kind === 'turn_completed' ? state.completedTurns + 1 : state.completedTurns,
    consecutivePunishments:
      signal.kind === 'punishment_resolved'
        ? state.consecutivePunishments + 1
        : signal.kind === 'turn_completed' && !signal.hadPunishment
          ? 0
          : state.consecutivePunishments,
    activePunishmentMultiplier:
      signal.kind === 'turn_completed'
        ? decrementRuleDuration(state.activePunishmentMultiplier)
        : state.activePunishmentMultiplier,
    activeBinding:
      signal.kind === 'turn_completed'
        ? decrementRuleDuration(state.activeBinding)
        : state.activeBinding,
  })

  const eligible = nextState.deck.filter(card => {
    if (!matchesSignal(card, nextState, signal)) return false
    return !nextState.triggerKeys.includes(triggerKeyFor(card, nextState))
  })
  if (eligible.length === 0) return Object.freeze({ state: nextState })

  const drawnCard = chooseCard(eligible)
  if (!eligible.includes(drawnCard)) throw new Error('事件抽取器必须返回候选卡牌')
  nextState = freezeState({
    ...nextState,
    consecutivePunishments:
      drawnCard.trigger.kind === 'consecutive_punishments' ? 0 : nextState.consecutivePunishments,
    triggerKeys: [...nextState.triggerKeys, triggerKeyFor(drawnCard, nextState)].slice(-100),
  })
  return Object.freeze({ state: nextState, drawnCard })
}

export function activatePartyEvent(
  state: PartyEventState,
  card: PartyEventCard,
  selectedPlayerIndices: readonly number[] = []
): PartyEventState {
  if (!state.deck.some(deckCard => deckCard.id === card.id)) {
    throw new Error('只能激活当前卡包中的事件')
  }
  if (card.effect.kind === 'punishment_multiplier') {
    return freezeState({
      ...state,
      activePunishmentMultiplier: {
        multiplier: card.effect.multiplier,
        remainingTurns: card.effect.durationTurns,
      },
    })
  }
  if (card.effect.kind === 'bind_players') {
    if (
      selectedPlayerIndices.length !== 2 ||
      selectedPlayerIndices[0] === selectedPlayerIndices[1] ||
      selectedPlayerIndices.some(index => !Number.isInteger(index) || index < 0)
    ) {
      throw new Error('绑定事件需要两名不同玩家')
    }
    return freezeState({
      ...state,
      activeBinding: {
        playerIndices: [selectedPlayerIndices[0], selectedPlayerIndices[1]],
        remainingTurns: card.effect.durationTurns,
      },
    })
  }
  return state
}

export function applyPartyEventPunishmentRules(
  state: PartyEventState,
  resolution: ResolvedPunishmentResult
): ResolvedPunishmentResult {
  const multiplier = state.activePunishmentMultiplier?.multiplier
  if (!multiplier || multiplier === 1) return resolution
  if (resolution.count.kind === 'fixed') {
    return scaleResolvedPunishmentCount(resolution, multiplier)
  }
  return Object.freeze({
    ...resolution,
    countMultiplier: (resolution.countMultiplier ?? 1) * multiplier,
  })
}

export function getBoundPartnerPlayerIndex(
  state: PartyEventState,
  playerIndex: number
): number | undefined {
  const binding = state.activeBinding?.playerIndices
  if (!binding) return undefined
  if (binding[0] === playerIndex) return binding[1]
  if (binding[1] === playerIndex) return binding[0]
  return undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const positiveInteger = (value: unknown, maximum = 999): value is number =>
  Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum

export function validatePartyEventDeck(value: unknown): PartyEventDeckValidation {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return { ok: false, error: '事件卡包必须包含 1–100 张卡牌' }
  }
  const ids = new Set<string>()
  for (const rawCard of value) {
    if (!isRecord(rawCard)) return { ok: false, error: '事件卡必须是对象' }
    const { id, title, description, tags, trigger, effect } = rawCard
    if (typeof id !== 'string' || !id.trim() || id.length > 60 || ids.has(id)) {
      return { ok: false, error: '事件卡 id 必须唯一且长度为 1–60' }
    }
    ids.add(id)
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 60 ||
      typeof description !== 'string' ||
      !description.trim() ||
      description.length > 240
    ) {
      return { ok: false, error: `事件卡 ${id} 的标题或描述无效` }
    }
    if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || tag.length > 20)) {
      return { ok: false, error: `事件卡 ${id} 的标签无效` }
    }
    if (!isRecord(trigger) || typeof trigger.kind !== 'string') {
      return { ok: false, error: `事件卡 ${id} 的触发条件无效` }
    }
    if (
      (trigger.kind === 'every_n_turns' && !positiveInteger(trigger.interval, 100)) ||
      (trigger.kind === 'consecutive_punishments' && !positiveInteger(trigger.count, 20)) ||
      (trigger.kind === 'dice_value' && !positiveInteger(trigger.value, 6)) ||
      !['every_n_turns', 'consecutive_punishments', 'dice_value'].includes(trigger.kind)
    ) {
      return { ok: false, error: `事件卡 ${id} 的触发参数越界` }
    }
    if (!isRecord(effect) || typeof effect.kind !== 'string') {
      return { ok: false, error: `事件卡 ${id} 的效果无效` }
    }
    if (effect.kind === 'punishment_multiplier') {
      if (
        typeof effect.multiplier !== 'number' ||
        effect.multiplier < 0.5 ||
        effect.multiplier > 5 ||
        !positiveInteger(effect.durationTurns, 20)
      ) {
        return { ok: false, error: `事件卡 ${id} 的惩罚倍率无效` }
      }
    } else if (effect.kind === 'mini_game') {
      if (!['reaction', 'memory', 'quick_quiz'].includes(String(effect.game))) {
        return { ok: false, error: `事件卡 ${id} 的小游戏无效` }
      }
    } else if (effect.kind === 'vote') {
      if (
        typeof effect.prompt !== 'string' ||
        !effect.prompt.trim() ||
        !Array.isArray(effect.options) ||
        effect.options.length < 2 ||
        effect.options.length > 6 ||
        effect.options.some(option => typeof option !== 'string' || !option.trim())
      ) {
        return { ok: false, error: `事件卡 ${id} 的投票选项无效` }
      }
    } else if (effect.kind === 'rock_paper_scissors') {
      // No configurable fields; the UI collects one private choice per player.
    } else if (effect.kind === 'bind_players') {
      if (!positiveInteger(effect.durationTurns, 20)) {
        return { ok: false, error: `事件卡 ${id} 的绑定时长无效` }
      }
    } else {
      return { ok: false, error: `事件卡 ${id} 包含未知效果` }
    }
  }
  return { ok: true }
}
