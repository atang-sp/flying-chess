import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zh from './locales/zh-CN.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ru from './locales/ru.json'
import pt from './locales/pt.json'
import it from './locales/it.json'
import { loadLocalePreference } from './utils/cache'

const savedLanguage = loadLocalePreference()
const supportedLanguages = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt', 'it']

const initialLocale =
  savedLanguage && supportedLanguages.includes(savedLanguage) ? savedLanguage : 'zh'

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { zh, en, ja, ko, es, fr, de, ru, pt, it },
})
