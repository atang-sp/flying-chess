/**
 * Locale content singleton resolved at module load time.
 *
 * Initialisation priority:
 *   1. User's explicit choice persisted in localStorage
 *   2. Browser's `navigator.language` (BCP-47)
 *   3. Fallback to English
 *
 * The resolved content covers punishment tools, body parts, positions, traps,
 * Q&A questions and Dare instructions.
 *
 * Usage:
 *   import { localeContent } from '../utils/locale'
 *   localeContent.punishmentConfig  // locale-appropriate defaults
 *   localeContent.defaultPlayerName(0)  // "玩家1" or "Player 1"
 */
import { getLocaleContent, type LocaleContent } from '@flying-chess/game-core/config'
import { loadLocalePreference, saveLocalePreference } from './cache'
import { i18n } from '../i18n'

export type { LocaleContent }

/** Resolve the initial language: saved preference > navigator.language > 'en'. */
function resolveInitialLanguage(): string {
  const saved = loadLocalePreference()
  if (saved) return saved
  return (typeof navigator !== 'undefined' && navigator.language.split('-')[0]) || 'en'
}

/** BCP-47 tag resolved at module-load time.  May be overridden via `setActiveLanguage`. */
export let activeLanguage: string = resolveInitialLanguage()

/** Stable singleton for the detected locale. */
export let localeContent: LocaleContent = getLocaleContent(activeLanguage)

/**
 * Force a specific locale (e.g. when the user switches language via the UI).
 * The choice is persisted to localStorage so it survives page reloads.
 * Returns the newly active content object.
 */
export function setActiveLanguage(language: string): LocaleContent {
  activeLanguage = language
  localeContent = getLocaleContent(language)
  saveLocalePreference(language)
  if (i18n.global) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    i18n.global.locale.value = language as any
  }
  return localeContent
}

/**
 * Returns `true` when the active locale is Chinese (zh-*).
 * Useful for conditional UI strings that are not yet fully i18n'd.
 */
export function isChineseLocale(): boolean {
  return activeLanguage.toLowerCase().startsWith('zh')
}
