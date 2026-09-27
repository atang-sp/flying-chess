/**
 * Locale content singleton resolved at module load time.
 *
 * The locale is determined from `navigator.language` (BCP-47) and falls back
 * gracefully to English for any non-Chinese browser.  The resolved content
 * covers punishment tools, body parts, positions, traps, Q&A questions and
 * Dare instructions.
 *
 * Usage:
 *   import { localeContent } from '../utils/locale'
 *   localeContent.punishmentConfig  // locale-appropriate defaults
 *   localeContent.defaultPlayerName(0)  // "玩家1" or "Player 1"
 */
import { getLocaleContent, type LocaleContent } from '@flying-chess/game-core/config'

export type { LocaleContent }

/** BCP-47 tag resolved at module-load time.  May be overridden in tests. */
export let activeLanguage: string =
  (typeof navigator !== 'undefined' && navigator.language) || 'en'

/** Stable singleton for the detected locale. */
export let localeContent: LocaleContent = getLocaleContent(activeLanguage)

/**
 * Force a specific locale (e.g. in tests or if the user switches language
 * manually).  Returns the newly active content object.
 */
export function setActiveLanguage(language: string): LocaleContent {
  activeLanguage = language
  localeContent = getLocaleContent(language)
  return localeContent
}

/**
 * Returns `true` when the active locale is Chinese (zh-*).
 * Useful for conditional UI strings that are not yet fully i18n'd.
 */
export function isChineseLocale(): boolean {
  return activeLanguage.toLowerCase().startsWith('zh')
}
