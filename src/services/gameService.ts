import type {
  Player,
  BoardCell,
  PunishmentConfig,
  PunishmentAction,
  PunishmentCombination,
  PunishmentBodyPart,
  PunishmentPosition,
  PunishmentConstraints,
  BoardConfig,
  TrapAction,
} from '@flying-chess/game-core/types'
import { GAME_CONFIG } from '../config/gameConfig'
import { SecureRandom } from '../utils/secureRandom'
import { createCompatiblePunishmentAction } from '@flying-chess/game-core/rule-resolution'
import { resolveCellEffect, resolvePlayerMovement } from '@flying-chess/game-core/movement'
import {
  applyEqualPunishmentRatios,
  generateBalancedPunishmentCombinationDefinitions as generateBalancedDefinitions,
  generateBalancedPunishmentCombinations as generateBalancedActions,
  generatePunishmentCombinationDefinitions as generateDefinitions,
  generatePunishmentCombinations as generateActions,
  isPositionCompatibleWithBodyPart,
  selectByRatio as selectPunishmentByRatio,
  updateBoardWithConfirmedCombinationDefinitions as updateBoardWithDefinitions,
  updateBoardWithConfirmedCombinations as updateBoardWithActions,
  type PunishmentCombinationRandomSource,
} from '@flying-chess/game-core/punishment-combinations'
import {
  createAutoBoardConfig as createCoreAutoBoardConfig,
  getBoardCellType,
  getPlayerDisplayPosition as getCorePlayerDisplayPosition,
  isSpecialBoardCell,
} from '@flying-chess/game-core/board-rules'
import {
  createPlayerRoster,
  DEFAULT_PLAYER_COLORS,
  hasPlayerWon,
  nextPlayerIndex,
} from '@flying-chess/game-core/player-rules'
import {
  createBoardConfig as createSharedBoardConfig,
  createPunishmentConfig as createSharedPunishmentConfig,
  createSharedBoard,
  inspectPunishmentConfig,
  normalizeBoardConfig,
  validateBoardConfig,
  type BoardRandomSource,
  type ConfigSnapshot,
  normalizeConfigSnapshot,
} from '@flying-chess/game-core/config'

export interface PartyBoardContentPools {
  readonly qaQuestions?: readonly string[]
  readonly dareInstructions?: readonly string[]
}

const punishmentCombinationRandomSource: PunishmentCombinationRandomSource = {
  random: () => SecureRandom.random(),
  randomInt: (minimum, maximum) => SecureRandom.randomInt(minimum, maximum),
}

export class GameService {
  private static latestBoard: BoardCell[] = []

  static isPositionCompatibleWithBodyPart(
    position: PunishmentPosition,
    bodyPart: PunishmentBodyPart
  ): boolean {
    return isPositionCompatibleWithBodyPart(position, bodyPart)
  }

  static createBoard(
    punishmentConfig?: PunishmentConfig,
    boardConfig?: BoardConfig,
    customTraps?: TrapAction[],
    contentPools?: PartyBoardContentPools,
    randomSource?: BoardRandomSource,
    modeConfig?: ConfigSnapshot
  ): BoardCell[] {
    // 1. 读取配置
    const config = punishmentConfig || this.createPunishmentConfig()
    const boardConf = boardConfig || GAME_CONFIG.DEFAULT_BOARD_CONFIG
    const traps = customTraps || this.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)

    if (!this.validateBoardConfig(boardConf)) {
      throw new Error('棋盘配置无效：格子数量必须为整数，且需要为起点和终点预留两个格子')
    }

    // 始终使用随机分配逻辑，确保所有格子都严格按照棋盘配置来生成
    const board = this.createBoardRandom(
      config,
      boardConf,
      traps,
      contentPools,
      randomSource,
      modeConfig
    )
    this.latestBoard = board
    return board
  }

  // 随机分配棋盘（自定义配置）
  private static createBoardRandom(
    config: PunishmentConfig,
    boardConf: BoardConfig,
    traps: TrapAction[],
    contentPools?: PartyBoardContentPools,
    randomSource?: BoardRandomSource,
    modeConfig?: ConfigSnapshot
  ): BoardCell[] {
    const qaQuestions = contentPools?.qaQuestions ?? [
      ...GAME_CONFIG.PARTY_QA_QUESTIONS.warmup,
      ...GAME_CONFIG.PARTY_QA_QUESTIONS.heating,
      ...GAME_CONFIG.PARTY_QA_QUESTIONS.finale,
    ]
    const dareInstructions = contentPools?.dareInstructions ?? [
      ...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.warmup,
      ...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.heating,
      ...GAME_CONFIG.PARTY_DARE_INSTRUCTIONS.finale,
    ]

    const baseConfig: ConfigSnapshot = modeConfig ?? {
      modeId: 'classic',
      rulesetVersion: 'classic_v1',
      boardConfig: normalizeBoardConfig(boardConf),
      punishmentConfig: config,
      traps,
      qaQuestions: [...qaQuestions],
      dareInstructions: [...dareInstructions],
      stageConstraints: {},
      authority: 'local',
    }
    return createSharedBoard(
      normalizeConfigSnapshot({
        ...baseConfig,
        boardConfig: normalizeBoardConfig(boardConf),
        punishmentConfig: config,
        traps,
        qaQuestions: [...(contentPools?.qaQuestions ?? baseConfig.qaQuestions ?? qaQuestions)],
        dareInstructions: [
          ...(contentPools?.dareInstructions ?? baseConfig.dareInstructions ?? dareInstructions),
        ],
      }),
      randomSource
    ) as BoardCell[]
  }

  static createPlayers(): Player[] {
    return createPlayerRoster({
      count: GAME_CONFIG.PLAYERS.DEFAULT_COUNT,
      names: GAME_CONFIG.PLAYERS.NAMES,
      colors: GAME_CONFIG.PLAYERS.COLORS,
    })
  }

  static createCustomPlayers(count: number, names: string[]): Player[] {
    return createPlayerRoster({ count, names, colors: DEFAULT_PLAYER_COLORS })
  }

  static createPunishmentConfig(): PunishmentConfig {
    return createSharedPunishmentConfig()
  }

  static createBoardConfig(): BoardConfig {
    return createSharedBoardConfig()
  }

  static validateBoardConfig(config: BoardConfig): boolean {
    return validateBoardConfig(config)
  }

  static createAutoBoardConfig(
    totalCells: number,
    contentCounts: Pick<BoardConfig, 'qaCells' | 'dareCells'> = {}
  ): BoardConfig {
    return createCoreAutoBoardConfig(totalCells, contentCounts)
  }

  static rollDice(): number {
    // 使用密码学安全的随机数生成器，完全不依赖 Math.random()
    return SecureRandom.randomInt(GAME_CONFIG.DICE.MIN_VALUE, GAME_CONFIG.DICE.MAX_VALUE)
  }

  static movePlayer(
    player: Player,
    diceValue: number,
    board: BoardCell[],
    currentPlayerIndex: number,
    totalPlayers: number,
    punishmentConfig: PunishmentConfig,
    constraints?: PunishmentConstraints
  ): {
    newPosition: number
    effect?: string
    punishment?: PunishmentAction
    targetPlayerIndex?: number
    cellEffect?: BoardCell['effect']
    canTakeOff?: boolean
    executorIndex?: number
    forcedTakeoffDueToFailure?: boolean
  } {
    const { playerState, ...movement } = resolvePlayerMovement({
      player,
      diceValue,
      board,
      currentPlayerIndex,
      totalPlayers,
      punishmentConfig,
      constraints,
      random: { choice: entries => SecureRandom.choice([...entries]) },
    })
    player.hasTakenOff = playerState.hasTakenOff
    player.failedTakeoffAttempts = playerState.failedTakeoffAttempts
    player.isMoving = false
    return movement
  }

  // 处理格子效果（第二步）
  static processCellEffect(
    player: Player,
    cellEffect: BoardCell['effect'],
    boardSize: number = 40
  ): { newPosition: number; effect: string; fromPosition: number; toPosition: number } {
    return resolveCellEffect(player, cellEffect, boardSize)
  }
  static checkWinner(player: Player, boardSize: number = 40): boolean {
    return hasPlayerWon(player, boardSize)
  }

  static getNextPlayer(currentIndex: number, totalPlayers: number): number {
    return nextPlayerIndex(currentIndex, totalPlayers)
  }

  // 获取玩家在环形棋盘上的显示位置
  static getPlayerDisplayPosition(
    position: number,
    totalCells: number = this.latestBoard.length || GAME_CONFIG.DEFAULT_BOARD_CONFIG.totalCells
  ): { row: number; col: number } {
    return getCorePlayerDisplayPosition(position, totalCells)
  }

  // 检查是否为特殊格子
  static isSpecialCell(position: number, board: BoardCell[] = this.latestBoard): boolean {
    return isSpecialBoardCell(board, position)
  }

  // 获取格子类型
  static getCellType(position: number, board: BoardCell[] = this.latestBoard): BoardCell['type'] {
    return getBoardCellType(board, position) ?? 'bonus'
  }

  // 将配置对象转换为数组（添加 name 属性）
  static configToArray<T extends { ratio: number }>(
    config: Record<string, T>
  ): Array<T & { name: string }> {
    return Object.entries(config).map(([name, item]) => ({
      ...item,
      name,
    }))
  }

  // 将 trap 配置对象转换为数组
  static trapsToArray(config: Record<string, { description: string }>): TrapAction[] {
    return Object.entries(config).map(([name, item]) => ({
      name,
      description: item.description,
    }))
  }

  // 根据比例随机选择项目
  static selectByRatio<T extends { ratio: number }>(items: T[]): T {
    return selectPunishmentByRatio(items, punishmentCombinationRandomSource)
  }

  // 生成随机惩罚组合
  static generateRandomPunishment(
    config: PunishmentConfig,
    constraints?: PunishmentConstraints
  ): PunishmentAction {
    return createCompatiblePunishmentAction(config, undefined, constraints)
  }

  // 验证惩罚配置的合理性
  static validatePunishmentConfig(config: PunishmentConfig): {
    isValid: boolean
    errorMessage?: string
    requiredSensitivity?: number
  } {
    const result = inspectPunishmentConfig(config)
    if (result.isValid) return { isValid: true }
    return {
      isValid: false,
      errorMessage: result.issues[0]?.message ?? '惩罚配置无效。',
    }
  }

  static applyEqualRatio(config: PunishmentConfig): void {
    applyEqualPunishmentRatios(config)
  }

  static generatePunishmentCombinationDefinitions(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentCombination[] {
    return generateDefinitions(config, count, punishmentCombinationRandomSource)
  }

  static generatePunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    return generateActions(config, count, punishmentCombinationRandomSource)
  }

  static updateBoardWithConfirmedCombinationDefinitions(
    board: BoardCell[],
    combinations: PunishmentCombination[],
    config: PunishmentConfig
  ): BoardCell[] {
    if (combinations.length === 0) console.warn('没有可用的惩罚组合定义')
    const updated = updateBoardWithDefinitions(
      board,
      combinations,
      config,
      GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS,
      punishmentCombinationRandomSource
    )
    this.latestBoard = updated
    return updated
  }

  static updateBoardWithConfirmedCombinations(
    board: BoardCell[],
    combinations: PunishmentAction[]
  ): BoardCell[] {
    const updated = updateBoardWithActions(
      board,
      combinations,
      GAME_CONFIG.DYNAMIC_PUNISHMENT_CELLS
    )
    this.latestBoard = updated
    return updated
  }

  static generateBalancedPunishmentCombinationDefinitions(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentCombination[] {
    return generateBalancedDefinitions(config, count, punishmentCombinationRandomSource)
  }

  static generateBalancedPunishmentCombinations(
    config: PunishmentConfig,
    count: number = 10
  ): PunishmentAction[] {
    return generateBalancedActions(config, count, punishmentCombinationRandomSource)
  }
}
