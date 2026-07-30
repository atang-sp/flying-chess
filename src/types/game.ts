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
}

export interface PunishmentTool {
  name: string
  intensity: number // 1-5 强度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentBodyPart {
  name: string
  sensitivity: number // 1-5 耐受度等级
  ratio: number // 出现比例 (0-100)
}

export interface PunishmentPosition {
  name: string
  ratio: number // 出现比例 (0-100)
  compatibleBodyParts: string[] // 兼容的身体部位名称列表，空数组表示兼容所有
}

export interface PunishmentConfig {
  tools: Record<string, PunishmentTool>
  bodyParts: Record<string, PunishmentBodyPart>
  positions: Record<string, PunishmentPosition>
  minStrikes: number // 最小惩罚次数
  maxStrikes: number // 最大惩罚次数
  step: number // 惩罚次数步长
  maxTakeoffFailures: number // 最大起飞失败次数（达到后自动起飞）
  doublePunishmentChance: number // 惩罚翻倍概率（0-100）
}

// 惩罚组合定义（不包含具体次数）
export interface PunishmentCombination {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  description: string
}

// 完整的惩罚动作（包含具体次数）
export interface PunishmentAction {
  tool: PunishmentTool
  bodyPart: PunishmentBodyPart
  position: PunishmentPosition
  strikes?: number
  description: string
  dynamicType?: 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice'
  multiplier?: number
  targetPlayer?: 'current' | 'previous' | 'next' | 'other'
}

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

export interface BoardCell {
  id: number
  type: 'punishment' | 'bonus' | 'special' | 'restart' | 'trap' | 'chain_punishment' | 'qa' | 'dare'
  effect?: {
    type:
      | 'punishment'
      | 'move'
      | 'rest'
      | 'reverse'
      | 'restart'
      | 'trap'
      | 'bounce'
      | 'chain_punishment'
      | 'qa'
      | 'dare'
    value: number
    description: string
    punishment?: PunishmentAction
    dynamicType?: 'dice_multiplier' | 'previous_player' | 'next_player' | 'other_player_choice'
    multiplier?: number
    trapVariant?: TrapVariant
    choiceA?: string
    choiceB?: string
  }
  position: number
}

export interface CellEffect {
  type: 'move' | 'rest' | 'reverse' | 'restart' | 'bounce' | 'chain_punishment' | 'qa' | 'dare'
  value: number
  description: string
}

export interface BoardConfig {
  punishmentCells: number
  chainPunishmentCells: number
  bonusCells: number
  reverseCells: number
  restCells: number
  restartCells: number
  trapCells: number
  totalCells: number
  qaCells?: number
  dareCells?: number
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

export interface DiceAnimation {
  isRolling: boolean
  duration: number
}

export interface TrapAction {
  name: string
  description: string
}

// --- Party mode extensions (升温局专属) ---

/** Constraints for act-aware punishment generation in party mode */
export interface PunishmentConstraints {
  readonly maxToolIntensity?: number
  readonly minStrikes?: number
  readonly maxStrikes?: number
  readonly doublePunishmentChance?: number
}

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
export type TrapVariant = 'text' | 'all_players' | 'choice' | 'roulette'

/** Extended trap with structured type */
export interface StructuredTrapAction extends TrapAction {
  readonly trapVariant: TrapVariant
  readonly choiceA?: string
  readonly choiceB?: string
}

/** Punishment variant for party mode */
export type PunishmentVariant = 'blindbox' | 'conditional' | 'deferred' | 'mutual'

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
