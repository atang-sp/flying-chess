import { GameService } from '../services/gameService'
import type { BoardConfig } from '../types/game'

type UnknownRecord = Record<string, unknown>

interface NamedEntry {
  name: string
  value: UnknownRecord
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

function validateNumber(
  value: unknown,
  path: string,
  errors: string[],
  { min, max, integer = false }: { min: number; max: number; integer?: boolean }
): value is number {
  const valid =
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (!integer || Number.isInteger(value)) &&
    value >= min &&
    value <= max

  if (!valid) {
    errors.push(`${path} 必须是 ${min}-${max} 范围内的${integer ? '整数' : '数字'}`)
  }
  return valid
}

function readNamedEntries(raw: unknown, path: string, errors: string[]): NamedEntry[] {
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      errors.push(`${path} 不能为空`)
      return []
    }

    return raw.flatMap((entry, index) => {
      if (!isRecord(entry) || !isNonEmptyString(entry.name)) {
        errors.push(`${path}[${index}].name 必须是非空字符串`)
        return []
      }
      return [{ name: entry.name, value: entry }]
    })
  }

  if (!isRecord(raw) || Object.keys(raw).length === 0) {
    errors.push(`${path} 必须是非空记录或数组`)
    return []
  }

  return Object.entries(raw).flatMap(([name, entry]) => {
    if (!isNonEmptyString(name) || !isRecord(entry)) {
      errors.push(`${path}.${name || '<空名称>'} 必须是配置对象`)
      return []
    }
    if (entry.name !== undefined && !isNonEmptyString(entry.name)) {
      errors.push(`${path}.${name}.name 必须是非空字符串`)
    }
    return [{ name, value: entry }]
  })
}

function requirePositiveWeight(entries: NamedEntry[], path: string, errors: string[]): void {
  if (
    entries.length > 0 &&
    !entries.some(({ value }) => validateWeightWithoutReporting(value.ratio))
  ) {
    errors.push(`${path} 至少需要一个大于 0 的 ratio`)
  }
}

const validateWeightWithoutReporting = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100

function validatePlayerSettings(raw: unknown, errors: string[]): void {
  if (!isRecord(raw)) {
    errors.push('data.playerSettings 必须是对象')
    return
  }

  const countValid =
    typeof raw.playerCount === 'number' && Number.isInteger(raw.playerCount) && raw.playerCount >= 1
  if (!countValid) {
    errors.push('data.playerSettings.playerCount 必须是至少为 1 的整数')
  }

  if (
    !Array.isArray(raw.playerNames) ||
    raw.playerNames.length !== raw.playerCount ||
    !raw.playerNames.every(isNonEmptyString)
  ) {
    errors.push('data.playerSettings.playerNames 必须与玩家数量匹配且名称不能为空')
  }
}

function validateBoardConfig(raw: unknown, errors: string[]): void {
  if (!isRecord(raw)) {
    errors.push('data.boardConfig 必须是对象')
    return
  }

  const fields = [
    'punishmentCells',
    'bonusCells',
    'reverseCells',
    'restCells',
    'restartCells',
    'trapCells',
    'totalCells',
  ] as const
  const allNumeric = fields.every(field => typeof raw[field] === 'number')

  if (!allNumeric || !GameService.validateBoardConfig(raw as unknown as BoardConfig)) {
    errors.push(
      'data.boardConfig 格子数必须为整数，总格子数须为 20-100，且需为起点和终点预留两个格子'
    )
  }
}

function validatePunishmentConfig(raw: unknown, errors: string[]): void {
  if (!isRecord(raw)) {
    errors.push('data.punishmentConfig 必须是对象')
    return
  }

  const tools = readNamedEntries(raw.tools, 'data.punishmentConfig.tools', errors)
  const bodyParts = readNamedEntries(raw.bodyParts, 'data.punishmentConfig.bodyParts', errors)
  const positions = readNamedEntries(raw.positions, 'data.punishmentConfig.positions', errors)

  tools.forEach(({ name, value }) => {
    validateNumber(value.intensity, `data.punishmentConfig.tools.${name}.intensity`, errors, {
      min: 1,
      max: 10,
      integer: true,
    })
    validateNumber(value.ratio, `data.punishmentConfig.tools.${name}.ratio`, errors, {
      min: 0,
      max: 100,
    })
  })
  requirePositiveWeight(tools, 'data.punishmentConfig.tools', errors)

  bodyParts.forEach(({ name, value }) => {
    validateNumber(
      value.sensitivity,
      `data.punishmentConfig.bodyParts.${name}.sensitivity`,
      errors,
      { min: 1, max: 10, integer: true }
    )
    validateNumber(value.ratio, `data.punishmentConfig.bodyParts.${name}.ratio`, errors, {
      min: 0,
      max: 100,
    })
  })
  requirePositiveWeight(bodyParts, 'data.punishmentConfig.bodyParts', errors)

  const bodyPartNames = new Set(bodyParts.map(entry => entry.name))
  positions.forEach(({ name, value }) => {
    validateNumber(value.ratio, `data.punishmentConfig.positions.${name}.ratio`, errors, {
      min: 0,
      max: 100,
    })

    if (value.compatibleBodyParts === undefined) return
    if (
      !Array.isArray(value.compatibleBodyParts) ||
      !value.compatibleBodyParts.every(isNonEmptyString)
    ) {
      errors.push(`data.punishmentConfig.positions.${name}.compatibleBodyParts 必须是字符串数组`)
      return
    }
    value.compatibleBodyParts.forEach(bodyPartName => {
      if (!bodyPartNames.has(bodyPartName)) {
        errors.push(
          `data.punishmentConfig.positions.${name}.compatibleBodyParts 引用了不存在的部位 "${bodyPartName}"`
        )
      }
    })
  })
  requirePositiveWeight(positions, 'data.punishmentConfig.positions', errors)

  const minStrikes = raw.minStrikes
  const maxStrikes = raw.maxStrikes
  const step = raw.step
  const minValid = validateNumber(minStrikes, 'data.punishmentConfig.minStrikes', errors, {
    min: 1,
    max: 100,
    integer: true,
  })
  const maxValid = validateNumber(maxStrikes, 'data.punishmentConfig.maxStrikes', errors, {
    min: 1,
    max: 100,
    integer: true,
  })
  const stepValid = validateNumber(step, 'data.punishmentConfig.step', errors, {
    min: 1,
    max: 100,
    integer: true,
  })
  validateNumber(raw.maxTakeoffFailures, 'data.punishmentConfig.maxTakeoffFailures', errors, {
    min: 1,
    max: 10,
    integer: true,
  })

  if (minValid && maxValid && minStrikes > maxStrikes) {
    errors.push('data.punishmentConfig.minStrikes 不能大于 maxStrikes')
  }
  if (
    minValid &&
    maxValid &&
    stepValid &&
    Math.ceil(minStrikes / step) > Math.floor(maxStrikes / step)
  ) {
    errors.push('data.punishmentConfig.step 在惩罚次数范围内无法产生有效值')
  }

  const validToolIntensities = tools
    .map(entry => entry.value.intensity)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 10)
  const validSensitivities = bodyParts
    .map(entry => entry.value.sensitivity)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 10)
  if (
    validToolIntensities.length === tools.length &&
    validSensitivities.length === bodyParts.length
  ) {
    tools.forEach(({ name, value }) => {
      if (!validSensitivities.some(sensitivity => sensitivity >= (value.intensity as number))) {
        errors.push(`data.punishmentConfig.tools.${name} 没有可承受其强度的部位`)
      }
    })
    bodyParts.forEach(({ name, value }) => {
      if (!validToolIntensities.some(intensity => intensity <= (value.sensitivity as number))) {
        errors.push(`data.punishmentConfig.bodyParts.${name} 没有可使用的工具`)
      }
    })
  }
}

function validateTrapConfig(raw: unknown, errors: string[]): void {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('data.trapConfig 必须是非空数组')
    return
  }

  raw.forEach((trap, index) => {
    if (!isRecord(trap) || !isNonEmptyString(trap.name) || !isNonEmptyString(trap.description)) {
      errors.push(`data.trapConfig[${index}] 必须包含非空的 name 和 description`)
    }
  })
}

function validateBoardContent(raw: unknown, errors: string[]): void {
  if (
    !isRecord(raw) ||
    !isNonEmptyString(raw.seed) ||
    !Array.isArray(raw.board) ||
    raw.board.length === 0
  ) {
    errors.push('data.boardContent 必须包含非空 seed 和 board 数组')
  }
}

export function validateImportedConfigData(configData: UnknownRecord): string[] {
  const errors: string[] = []

  if (configData.playerSettings !== undefined) {
    validatePlayerSettings(configData.playerSettings, errors)
  }
  if (configData.punishmentConfig !== undefined) {
    validatePunishmentConfig(configData.punishmentConfig, errors)
  }
  if (configData.boardConfig !== undefined) {
    validateBoardConfig(configData.boardConfig, errors)
  }
  if (configData.trapConfig !== undefined) {
    validateTrapConfig(configData.trapConfig, errors)
  }
  if (configData.boardContent !== undefined) {
    validateBoardContent(configData.boardContent, errors)
  }

  const knownSections = [
    'playerSettings',
    'punishmentConfig',
    'boardConfig',
    'trapConfig',
    'boardContent',
  ]
  if (!knownSections.some(section => configData[section] !== undefined)) {
    errors.push('data 至少需要包含一个可导入的配置项')
  }

  return errors
}
