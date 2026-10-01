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
import { ref } from 'vue'
import { getLocaleContent, type LocaleContent } from '@flying-chess/game-core/config'
import { loadLocalePreference, saveLocalePreference } from './cache'
import { i18n } from '../i18n'

export type { LocaleContent }

export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '🇨🇳 中文' },
  { code: 'en', name: '🌐 English' },
  { code: 'ja', name: '🇯🇵 日本語' },
  { code: 'ko', name: '🇰🇷 한국어' },
  { code: 'es', name: '🇪🇸 Español' },
  { code: 'fr', name: '🇫🇷 Français' },
  { code: 'de', name: '🇩🇪 Deutsch' },
  { code: 'ru', name: '🇷🇺 Русский' },
  { code: 'pt', name: '🇵🇹 Português' },
  { code: 'it', name: '🇮🇹 Italiano' },
] as const

/** Resolve the initial language: saved preference > browser language > 'zh'. */
function resolveInitialLanguage(): string {
  const saved = loadLocalePreference()
  if (saved) return saved
  if (typeof navigator !== 'undefined' && navigator.language) {
    const nav = navigator.language.toLowerCase()
    for (const lang of SUPPORTED_LANGUAGES) {
      if (nav.startsWith(lang.code)) return lang.code
    }
  }
  return 'zh'
}

/** BCP-47 tag resolved at module-load time.  May be overridden via `setActiveLanguage`. */
export let activeLanguage: string = resolveInitialLanguage()
export const currentLanguageRef = ref(activeLanguage)

if (typeof document !== 'undefined') {
  document.documentElement.lang = activeLanguage
}

/** Stable singleton for the detected locale. */
export let localeContent: LocaleContent = getLocaleContent(activeLanguage)

/** Reactive ref that mirrors `localeContent` — use this in Vue components that need to react to language changes. */
export const localeContentRef = ref<LocaleContent>(localeContent)

/**
 * Force a specific locale (e.g. when the user switches language via the UI).
 * The choice is persisted to localStorage so it survives page reloads.
 * Returns the newly active content object.
 */
export function setActiveLanguage(language: string, persist = true): LocaleContent {
  activeLanguage = language
  // Update localeContent BEFORE updating currentLanguageRef so that any
  // watchers that fire on currentLanguageRef already see the new content.
  localeContent = getLocaleContent(language)
  localeContentRef.value = localeContent
  currentLanguageRef.value = language
  if (persist) saveLocalePreference(language)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
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

export {
  localizeToolName,
  localizeBodyPartName,
  localizePositionName,
  localizePunishmentDescription,
} from './punishmentLocalization'
