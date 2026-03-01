import type {
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
} from '../types/game'

type LegacyConfigEntries = {
  tools: PunishmentConfig['tools'] | PunishmentTool[]
  bodyParts: PunishmentConfig['bodyParts'] | PunishmentBodyPart[]
  positions: PunishmentConfig['positions'] | PunishmentPosition[]
}

const normalizeNamedEntries = <T extends { name: string }>(
  entries: Record<string, T> | T[]
): Record<string, T> => {
  if (!Array.isArray(entries)) {
    return entries
  }

  return entries.reduce<Record<string, T>>((acc, entry) => {
    acc[entry.name] = entry
    return acc
  }, {})
}

export function usePunishmentConfigNormalizer() {
  const normalizePunishmentConfig = (config: PunishmentConfig): PunishmentConfig => {
    const legacyConfig = config as PunishmentConfig & LegacyConfigEntries

    return {
      ...config,
      tools: normalizeNamedEntries(legacyConfig.tools),
      bodyParts: normalizeNamedEntries(legacyConfig.bodyParts),
      positions: normalizeNamedEntries(legacyConfig.positions),
    }
  }

  return {
    normalizePunishmentConfig,
  }
}
