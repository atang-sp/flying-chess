import type { Player } from './domainTypes'
import {
  createCompatiblePunishmentAction,
  cryptoRandomInt,
  type BoardCell,
  type PunishmentAction,
  type PunishmentConfig,
  type PunishmentConstraints,
} from './sharedConfig'

export interface MovementRandomSource {
  choice<T>(entries: readonly T[]): T
}

export interface PlayerMovementInput {
  readonly player: Readonly<Player>
  readonly diceValue: number
  readonly board: readonly BoardCell[]
  readonly currentPlayerIndex: number
  readonly totalPlayers: number
  readonly punishmentConfig: PunishmentConfig
  readonly constraints?: PunishmentConstraints
  readonly random?: MovementRandomSource
}

export interface PlayerMovementResult {
  readonly newPosition: number
  readonly playerState: Readonly<{
    hasTakenOff: boolean
    failedTakeoffAttempts: number
  }>
  readonly effect?: string
  readonly punishment?: PunishmentAction
  readonly targetPlayerIndex?: number
  readonly cellEffect?: BoardCell['effect']
  readonly canTakeOff?: boolean
  readonly executorIndex?: number
  readonly forcedTakeoffDueToFailure?: boolean
}

const secureRandom: MovementRandomSource = {
  choice: entries => {
    if (entries.length === 0) throw new Error('不能从空集合中选择')
    const selected = entries[cryptoRandomInt(0, entries.length - 1)]
    if (selected === undefined) throw new Error('随机选择结果超出集合范围')
    return selected
  },
}

/** Resolve one dice movement without timers, DOM state, or mutating the caller's player. */
export function resolvePlayerMovement(input: PlayerMovementInput): PlayerMovementResult {
  const {
    player,
    diceValue,
    board,
    currentPlayerIndex,
    totalPlayers,
    punishmentConfig,
    constraints,
    random = secureRandom,
  } = input
  let hasTakenOff = player.hasTakenOff ?? false
  let failedTakeoffAttempts = player.failedTakeoffAttempts ?? 0
  let newPosition = player.position
  let effect: string | undefined
  let punishment: PunishmentAction | undefined
  let cellEffect: BoardCell['effect']
  let canTakeOff = false
  let executorIndex: number | undefined

  const result = (
    overrides: Partial<Omit<PlayerMovementResult, 'newPosition' | 'playerState'>> = {}
  ): PlayerMovementResult => ({
    newPosition,
    playerState: { hasTakenOff, failedTakeoffAttempts },
    effect,
    punishment,
    cellEffect,
    canTakeOff,
    executorIndex,
    ...overrides,
  })

  if (player.position === 0 && !hasTakenOff) {
    if (diceValue === 6) {
      hasTakenOff = true
      failedTakeoffAttempts = 0
      newPosition = 1
      effect = '起飞成功！移动到第1格'
      canTakeOff = true
    } else {
      failedTakeoffAttempts += 1
      if (
        punishmentConfig.maxTakeoffFailures !== undefined &&
        failedTakeoffAttempts >= punishmentConfig.maxTakeoffFailures
      ) {
        hasTakenOff = true
        failedTakeoffAttempts = 0
        newPosition = 1
        effect = `运气太差，连续${punishmentConfig.maxTakeoffFailures}次未起飞，自动起飞！移动到第1格`
        canTakeOff = true
        return result({ forcedTakeoffDueToFailure: true })
      }

      const generated = createCompatiblePunishmentAction(punishmentConfig, undefined, constraints)
      const otherPlayerIndices = Array.from({ length: totalPlayers }, (_, index) => index).filter(
        index => index !== currentPlayerIndex
      )
      if (otherPlayerIndices.length > 0) executorIndex = random.choice(otherPlayerIndices)
      punishment = {
        ...generated,
        description: `未起飞，被惩罚：${generated.description}`,
      }
      effect = '未起飞！被惩罚'
      return result()
    }
  } else {
    const originalTargetPosition = player.position + diceValue
    newPosition = originalTargetPosition
    if (newPosition > board.length) {
      const overflow = newPosition - board.length
      newPosition = Math.max(1, board.length - overflow)
      cellEffect = {
        type: 'bounce',
        value: overflow,
        description: `第${player.position}格 → 第${originalTargetPosition}格 → 第${newPosition}格`,
      }
      effect = `超出终点${overflow}格，反弹到第${newPosition}格`
      return result()
    }
  }

  const targetCell = board.find(cell => cell.position === newPosition)
  if (!targetCell?.effect) return result()
  if (newPosition === board.length) {
    effect = '到达终点！游戏胜利！'
    return result()
  }
  if (newPosition === 1 && !canTakeOff) {
    effect = '到达飞机场！安全区域'
    return result()
  }

  cellEffect = targetCell.effect
  switch (targetCell.effect.type) {
    case 'punishment':
      if (targetCell.effect.punishment) {
        punishment = targetCell.effect.punishment
        effect = `触发惩罚：${punishment.tool.name} ${punishment.bodyPart.name} ${punishment.position.name}`
      }
      break
    case 'chain_punishment':
      if (targetCell.effect.punishment) {
        punishment = targetCell.effect.punishment
        effect = `🔗 触发连锁惩罚：${punishment.tool.name} ${punishment.bodyPart.name} ${punishment.position.name}`
      }
      break
    case 'trap':
      effect = `💀 触发机关陷阱！${targetCell.effect.description}`
      break
    case 'move':
      effect = `移动到第${newPosition}格，触发前进${targetCell.effect.value}步效果`
      break
    case 'reverse':
      effect = `移动到第${newPosition}格，触发后退${targetCell.effect.value}步效果`
      break
    case 'restart':
      effect = `移动到第${newPosition}格，触发回到起点效果`
      break
    case 'rest':
      effect = `移动到第${newPosition}格，休息${targetCell.effect.value}回合`
      break
    case 'qa':
      effect = '❓ 问答时间！'
      break
    case 'dare':
      effect = '🔥 执行指令！'
      break
  }
  return result()
}

export function resolveCellEffect(
  player: Readonly<Pick<Player, 'position'>>,
  cellEffect: BoardCell['effect'],
  boardSize: number
): { newPosition: number; effect: string; fromPosition: number; toPosition: number } {
  const fromPosition = player.position
  if (!cellEffect) {
    return { newPosition: fromPosition, effect: '无效果', fromPosition, toPosition: fromPosition }
  }

  let newPosition = fromPosition
  let effect: string
  switch (cellEffect.type) {
    case 'move': {
      const originalTargetPosition = fromPosition + cellEffect.value
      newPosition = originalTargetPosition
      if (newPosition > boardSize) {
        const overflow = newPosition - boardSize
        newPosition = Math.max(1, boardSize - overflow)
        effect = `前进${cellEffect.value}步，超出终点${overflow}格，反弹到第${newPosition}格`
      } else {
        effect = cellEffect.description || `前进${cellEffect.value}步`
      }
      break
    }
    case 'reverse':
      newPosition = Math.max(fromPosition - cellEffect.value, 1)
      effect = cellEffect.description || `后退${cellEffect.value}步`
      break
    case 'rest':
      effect = cellEffect.description || `休息${cellEffect.value}回合`
      break
    case 'restart':
      newPosition = 1
      effect = cellEffect.description || '回到起点'
      break
    case 'punishment':
      effect = cellEffect.description || '接受惩罚'
      break
    case 'chain_punishment':
      effect = cellEffect.description || '连锁惩罚'
      break
    case 'trap':
      effect = cellEffect.description || '触发机关'
      break
    case 'qa':
      effect = cellEffect.description || '问答时间'
      break
    case 'dare':
      effect = cellEffect.description || '执行指令'
      break
    default:
      effect = '未知效果'
  }
  return { newPosition, effect, fromPosition, toPosition: newPosition }
}
