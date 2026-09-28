import { getLocaleContent, type PunishmentAction } from '@flying-chess/game-core/config'
import { activeLanguage } from './locale'
import { i18n } from '../i18n'

const SUPPORTED_LANG_CODES = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt', 'it'] as const
type SupportedLangCode = (typeof SUPPORTED_LANG_CODES)[number]

const toolIndexMap = new Map<string, number>()
const bodyPartIndexMap = new Map<string, number>()
const positionIndexMap = new Map<string, number>()

const toolsByLocale: Record<string, string[]> = {}
const bodyPartsByLocale: Record<string, string[]> = {}
const positionsByLocale: Record<string, string[]> = {}

// Populate slot mappings across all 10 locales
for (const lang of SUPPORTED_LANG_CODES) {
  const content = getLocaleContent(lang)
  const tools = Object.keys(content.punishmentConfig.tools)
  const parts = Object.keys(content.punishmentConfig.bodyParts)
  const positions = Object.keys(content.punishmentConfig.positions)

  toolsByLocale[lang] = tools
  bodyPartsByLocale[lang] = parts
  positionsByLocale[lang] = positions

  tools.forEach((name, idx) => {
    if (!toolIndexMap.has(name)) toolIndexMap.set(name, idx)
  })
  parts.forEach((name, idx) => {
    if (!bodyPartIndexMap.has(name)) bodyPartIndexMap.set(name, idx)
  })
  positions.forEach((name, idx) => {
    if (!positionIndexMap.has(name)) positionIndexMap.set(name, idx)
  })
}

// Synonyms / aliases in case non-standard names are used
bodyPartIndexMap.set('臀部', 0)
positionIndexMap.set('俯卧', 2)
positionIndexMap.set('仰卧', 0)

function normalizeLang(lang?: string | { value?: string }): string {
  let fallback: string | undefined
  try {
    fallback = (i18n?.global?.locale as any)?.value
  } catch {
    // ignore
  }
  const raw =
    typeof lang === 'object' && lang !== null && 'value' in lang
      ? (lang as { value?: string }).value
      : lang
  const code = (raw || fallback || activeLanguage || 'zh').toLowerCase()
  for (const supported of SUPPORTED_LANGCODES_PREFIX) {
    if (code.startsWith(supported)) return supported
  }
  return 'en'
}

const SUPPORTED_LANGCODES_PREFIX: SupportedLangCode[] = [
  'zh',
  'ja',
  'ko',
  'es',
  'fr',
  'de',
  'ru',
  'pt',
  'it',
  'en',
]

/**
 * Translate a standard tool name to the target locale (defaults to current active locale).
 * If the name does not match any known standard tool, it is returned unchanged.
 */
export function localizeToolName(name: string, targetLocale?: string | { value?: string }): string {
  if (!name) return ''
  const lang = normalizeLang(targetLocale)
  const idx = toolIndexMap.get(name)
  if (idx !== undefined && toolsByLocale[lang]?.[idx]) {
    return toolsByLocale[lang][idx]
  }
  return name
}

/**
 * Translate a standard body part name to the target locale (defaults to current active locale).
 * If the name does not match any known standard body part, it is returned unchanged.
 */
export function localizeBodyPartName(
  name: string,
  targetLocale?: string | { value?: string }
): string {
  if (!name) return ''
  const lang = normalizeLang(targetLocale)
  const idx = bodyPartIndexMap.get(name)
  if (idx !== undefined && bodyPartsByLocale[lang]?.[idx]) {
    return bodyPartsByLocale[lang][idx]
  }
  return name
}

/**
 * Translate a standard position name to the target locale (defaults to current active locale).
 * If the name does not match any known standard position, it is returned unchanged.
 */
export function localizePositionName(
  name: string,
  targetLocale?: string | { value?: string }
): string {
  if (!name) return ''
  const lang = normalizeLang(targetLocale)
  const idx = positionIndexMap.get(name)
  if (idx !== undefined && positionsByLocale[lang]?.[idx]) {
    return positionsByLocale[lang][idx]
  }
  return name
}

interface FormatTemplates {
  withStrikes: (tool: string, part: string, strikes: number, pos: string) => string
  withoutStrikes: (tool: string, part: string, pos: string) => string
}

const DESCRIPTION_TEMPLATES: Record<string, FormatTemplates> = {
  zh: {
    withStrikes: (t, b, s, p) => `用${t}打${b}${s}下，姿势：${p}`,
    withoutStrikes: (t, b, p) => `用${t}打${b}，姿势：${p}`,
  },
  en: {
    withStrikes: (t, b, s, p) => `Use ${t} on ${b} for ${s} strikes, position: ${p}`,
    withoutStrikes: (t, b, p) => `Use ${t} on ${b}, position: ${p}`,
  },
  ja: {
    withStrikes: (t, b, s, p) => `${t}でお仕置き：${b}を${s}回、姿勢：${p}`,
    withoutStrikes: (t, b, p) => `${t}でお仕置き：${b}、姿勢：${p}`,
  },
  ko: {
    withStrikes: (t, b, s, p) => `${t}(으)로 ${b} ${s}대, 자세: ${p}`,
    withoutStrikes: (t, b, p) => `${t}(으)로 ${b}, 자세: ${p}`,
  },
  es: {
    withStrikes: (t, b, s, p) => `Usar ${t} en ${b} ${s} veces, postura: ${p}`,
    withoutStrikes: (t, b, p) => `Usar ${t} en ${b}, postura: ${p}`,
  },
  fr: {
    withStrikes: (t, b, s, p) => `Utiliser ${t} sur ${b} ${s} coups, posture : ${p}`,
    withoutStrikes: (t, b, p) => `Utiliser ${t} sur ${b}, posture : ${p}`,
  },
  de: {
    withStrikes: (t, b, s, p) => `Mit ${t} auf ${b} ${s} Schläge, Haltung: ${p}`,
    withoutStrikes: (t, b, p) => `Mit ${t} auf ${b}, Haltung: ${p}`,
  },
  ru: {
    withStrikes: (t, b, s, p) => `Использовать ${t} по ${b} ${s} раз(а), поза: ${p}`,
    withoutStrikes: (t, b, p) => `Использовать ${t} по ${b}, поза: ${p}`,
  },
  pt: {
    withStrikes: (t, b, s, p) => `Usar ${t} em ${b} ${s} vezes, postura: ${p}`,
    withoutStrikes: (t, b, p) => `Usar ${t} em ${b}, postura: ${p}`,
  },
  it: {
    withStrikes: (t, b, s, p) => `Usa ${t} su ${b} per ${s} colpi, posizione: ${p}`,
    withoutStrikes: (t, b, p) => `Usa ${t} su ${b}, posizione: ${p}`,
  },
}

const MULTIPLIER_SUFFIXES: Record<string, (m: number) => string> = {
  zh: m => `（骰点 × ${m}）`,
  ja: m => `（サイコロ出目 × ${m}）`,
  ko: m => ` (주사위 눈 × ${m})`,
  es: m => ` (Tirada de dado × ${m})`,
  fr: m => ` (Lancé de dé × ${m})`,
  de: m => ` (Würfelwurf × ${m})`,
  ru: m => ` (Бросок кубика × ${m})`,
  pt: m => ` (Rolagem de dados × ${m})`,
  it: m => ` (Lancio del dado × ${m})`,
  en: m => ` (Dice roll × ${m})`,
}

const PREVIOUS_PLAYER_PREFIXES: Record<string, string> = {
  zh: '上一个玩家：',
  ja: '前のプレイヤー：',
  ko: '이전 플레이어: ',
  es: 'Jugador anterior: ',
  fr: 'Joueur précédent : ',
  de: 'Vorheriger Spieler: ',
  ru: 'Предыдущий игрок: ',
  pt: 'Jogador anterior: ',
  it: 'Giocatore precedente: ',
  en: 'Previous player: ',
}

const NEXT_PLAYER_PREFIXES: Record<string, string> = {
  zh: '下一个玩家：',
  ja: '次のプレイヤー：',
  ko: '다음 플레이어: ',
  es: 'Siguiente jugador: ',
  fr: 'Joueur suivant : ',
  de: 'Nächster Spieler: ',
  ru: 'Следующий игрок: ',
  pt: 'Próximo jogador: ',
  it: 'Giocatore successivo: ',
  en: 'Next player: ',
}

/**
 * Generate a localized description for a punishment action in the target locale.
 */
export function localizePunishmentDescription(
  punishment: PunishmentAction,
  targetLocale?: string | { value?: string }
): string {
  if (!punishment || !punishment.tool || !punishment.bodyPart || !punishment.position) {
    return punishment?.description || ''
  }

  const lang = normalizeLang(targetLocale)
  const tool = localizeToolName(punishment.tool.name, lang)
  const bodyPart = localizeBodyPartName(punishment.bodyPart.name, lang)
  const position = localizePositionName(punishment.position.name, lang)

  const template = DESCRIPTION_TEMPLATES[lang] || DESCRIPTION_TEMPLATES.en
  let desc =
    punishment.strikes != null
      ? template.withStrikes(tool, bodyPart, punishment.strikes, position)
      : template.withoutStrikes(tool, bodyPart, position)

  if (punishment.dynamicType === 'dice_multiplier') {
    const mult = punishment.multiplier ?? 1
    const formatter = MULTIPLIER_SUFFIXES[lang] || MULTIPLIER_SUFFIXES.en
    desc += formatter(mult)
  }

  if (punishment.targetPlayer === 'previous') {
    const prefix = PREVIOUS_PLAYER_PREFIXES[lang] || PREVIOUS_PLAYER_PREFIXES.en
    desc = `${prefix}${desc}`
  } else if (punishment.targetPlayer === 'next') {
    const prefix = NEXT_PLAYER_PREFIXES[lang] || NEXT_PLAYER_PREFIXES.en
    desc = `${prefix}${desc}`
  }

  return desc
}
