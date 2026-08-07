import type {
  BoardCell,
  BoardConfig,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
  PunishmentVariant,
  TrapAction,
  TrapVariant,
} from './sharedConfig'

export type {
  BoardCell,
  BoardConfig,
  PunishmentAction,
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
  PunishmentVariant,
  PunishmentConstraints,
  TrapAction,
  TrapVariant,
} from './sharedConfig'

export interface Player {
  id: number
  name: string
  color: string
  position: number
  isWinner: boolean
  isMoving?: boolean // 添加移动动画状态
  hasTakenOff?: boolean // 是否已经起飞
  failedTakeoffAttempts?: number // 起飞失败次数
  /** 求饶成功后的下次惩罚倍数（如 1.5），用完即清除 */
  pendingMercyMultiplier?: number
  /** 尚未消费的跳过回合数 */
  pendingSkippedTurns?: number
  /** 小游戏胜利获得的一次性免罚。 */
  pendingMiniGameImmunity?: boolean
  /** 小游戏失败附加到下一次惩罚的一次性倍率。 */
  pendingMiniGameMultiplier?: number
}

// 惩罚组合定义（不包含具体次数）
export interface PunishmentCombination {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  description: string
}

// 完整的惩罚动作（包含具体次数）
export type RuleResolutionSource =
  | 'takeoff_failure'
  | 'board_punishment'
  | 'trap'
  | 'cell_effect'
  | 'qa'
  | 'dare'

export type ResolvedPunishmentCount =
  | Readonly<{ kind: 'fixed'; value: number }>
  | Readonly<{
      kind: 'awaiting_external_count'
      minimum: number
      maximum: number
      step: number
      eligibleChooserIndices: readonly number[]
    }>

export type TurnConsequence =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'skip_next_turns'; count: number }>

export type ResolvedPunishmentAction = Readonly<
  Omit<PunishmentAction, 'tool' | 'bodyPart' | 'position'>
> & {
  readonly tool: Readonly<PunishmentTool>
  readonly bodyPart: Readonly<PunishmentBodyPart>
  readonly position: Readonly<Omit<PunishmentPosition, 'compatibleBodyParts'>> & {
    readonly compatibleBodyParts: readonly string[]
  }
}

export interface ResolvedPunishmentResult {
  readonly kind: 'punishment'
  readonly source: 'takeoff_failure' | 'board_punishment'
  readonly actorIndex: number
  readonly targetPlayerIndex: number
  readonly executorIndex?: number
  readonly action: ResolvedPunishmentAction
  readonly count: ResolvedPunishmentCount
  readonly countMultiplier?: number
  readonly turnConsequence: TurnConsequence
  readonly variant?: PunishmentVariant
  readonly variantPhase?: PunishmentVariantPhase
}

export interface ResolvedTrapResult {
  readonly kind: 'trap'
  readonly source: 'trap'
  readonly actorIndex: number
  readonly acknowledgementRequired: true
  readonly description: string
  readonly turnConsequence: TurnConsequence
  readonly trapVariant?: TrapVariant
  readonly choiceA?: string
  readonly choiceB?: string
  readonly rouletteTargetIndex?: number
}

export interface ResolvedCellEffectResult {
  readonly kind: 'cell_effect'
  readonly source: 'cell_effect'
  readonly actorIndex: number
  readonly effect: NonNullable<BoardCell['effect']>
  readonly turnConsequence: TurnConsequence
}

export type ResolvedRuleResult =
  | ResolvedPunishmentResult
  | ResolvedTrapResult
  | ResolvedCellEffectResult
  | ResolvedQAResult
  | ResolvedDareResult

export interface CellEffect {
  type: 'move' | 'rest' | 'reverse' | 'restart' | 'bounce' | 'chain_punishment' | 'qa' | 'dare'
  value: number
  description: string
}

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  diceValue: number | null
  gameStatus:
    | 'waiting'
    | 'rolling'
    | 'moving'
    | 'showing_effect'
    | 'finished'
    | 'configuring'
    | 'intro'
    | 'board_settings'
    | 'settings'
  winner: Player | null
  board: BoardCell[]
  punishmentConfig: PunishmentConfig
  boardConfig: BoardConfig
  pendingEffect: CellEffect | null
}

/** Configurable end-of-game reward and loser gradient. */
export interface VictoryConfig {
  actionText: string
  baseCount: number
  countUnit: string
  loserGradientEnabled: boolean
  gradientStep: number
}

export interface DiceAnimation {
  isRolling: boolean
  duration: number
}

// --- Party mode extensions (升温局专属) ---

/** Q&A question entry for party mode 问答格 */
export interface QAQuestion {
  readonly text: string
  readonly act: 'warmup' | 'heating' | 'finale'
}

/** Dare instruction entry for party mode 指令格 */
export interface DareInstruction {
  readonly text: string
  readonly act: 'warmup' | 'heating' | 'finale'
}

/** Structured trap type discriminator */
/** Extended trap with structured type */
export interface StructuredTrapAction extends TrapAction {
  readonly trapVariant: TrapVariant
  readonly choiceA?: string
  readonly choiceB?: string
}

/** Punishment variant for party mode */
/** Runtime phase for punishment variants that span more than one decision or turn. */
export type PunishmentVariantPhase =
  | 'conditional_resolved'
  | 'deferred_execution'
  | 'mutual_return'
  | 'encore_return'

/** Resolved QA result */
export interface ResolvedQAResult {
  readonly kind: 'qa'
  readonly source: 'qa'
  readonly actorIndex: number
  readonly question: string
  readonly turnConsequence: TurnConsequence
}

/** Resolved Dare result */
export interface ResolvedDareResult {
  readonly kind: 'dare'
  readonly source: 'dare'
  readonly actorIndex: number
  readonly instruction: string
  readonly turnConsequence: TurnConsequence
}

/** Party mode scene preset identifier */
export type PartyScenePreset = 'icebreaker' | 'hardcore' | 'intimate' | 'group_fun'
