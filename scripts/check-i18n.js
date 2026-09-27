import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const refFile = path.join(localesDir, 'zh-CN.json')
const refData = JSON.parse(fs.readFileSync(refFile, 'utf8'))
const refKeys = Object.keys(refData)

const langs = ['en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'pt', 'it']
let ok = true

langs.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`)
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${lang}: file does not exist!`)
    ok = false
    return
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const keys = Object.keys(data)
  const missing = refKeys.filter(k => !keys.includes(k))
  const extra = keys.filter(k => !refKeys.includes(k))

  if (missing.length) {
    console.error(
      `❌ ${lang}: missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}...`
    )
    ok = false
  }
  if (extra.length) {
    console.error(`❌ ${lang}: extra ${extra.length} keys: ${extra.slice(0, 5).join(', ')}...`)
    ok = false
  }
  if (!missing.length && !extra.length) {
    console.log(`✅ ${lang}: ${keys.length} keys match zh-CN.json`)
  }
})

if (ok) {
  console.log(
    `\n🎉 All ${langs.length} locale files are consistent with zh-CN.json (${refKeys.length} keys).`
  )
  process.exit(0)
} else {
  console.error('\n❌ Locale consistency check failed.')
  process.exit(1)
}
