import type {
  PunishmentBodyPart,
  PunishmentConfig,
  PunishmentPosition,
  PunishmentTool,
} from '../types/game'

type LegacyPosition = Omit<PunishmentPosition, 'compatibleBodyParts'> & {
  compatibleBodyParts?: string[]
}

type LegacyConfigEntries = {
  tools: PunishmentConfig['tools'] | PunishmentTool[]
  bodyParts: PunishmentConfig['bodyParts'] | PunishmentBodyPart[]
  positions: Record<string, LegacyPosition> | LegacyPosition[]
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

function normalizePositions(
  entries: Record<string, LegacyPosition> | LegacyPosition[]
): Record<string, PunishmentPosition> {
  const normalized = Array.isArray(entries)
    ? entries.reduce<Record<string, LegacyPosition>>((acc, entry) => {
        acc[entry.name] = entry
        return acc
      }, {})
    : entries

  const result: Record<string, PunishmentPosition> = {}
  for (const [key, pos] of Object.entries(normalized)) {
    result[key] = {
      ...pos,
      compatibleBodyParts: pos.compatibleBodyParts ?? [],
    }
  }
  return result
}

export function usePunishmentConfigNormalizer() {
  const normalizePunishmentConfig = (config: PunishmentConfig): PunishmentConfig => {
    const legacyConfig = config as PunishmentConfig & LegacyConfigEntries

    return {
      ...config,
      tools: normalizeNamedEntries(legacyConfig.tools),
      bodyParts: normalizeNamedEntries(legacyConfig.bodyParts),
      positions: normalizePositions(legacyConfig.positions),
    }
  }

  return {
    normalizePunishmentConfig,
  }
}
