#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { validateImportData } from '../src/utils/configImportContract'

export function validateConfigDocument(data: unknown) {
  return validateImportData(data)
}

function main(): void {
  const configPath = process.argv[2]
  if (!configPath) {
    console.log('使用方法: tsx scripts/validate-config.ts <配置文件路径>')
    process.exitCode = 1
    return
  }

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as unknown
    const result = validateConfigDocument(config)

    if (!result.isValid) {
      console.log('❌ 配置文件验证失败！')
      console.log('\n错误详情:')
      result.errors.forEach((error, index) => console.log(`${index + 1}. ${error}`))
      process.exitCode = 1
      return
    }

    console.log('✅ 配置文件验证通过！')
    console.log(`📁 文件: ${configPath}`)
    result.warnings.forEach(warning => console.log(`⚠️ ${warning}`))
  } catch (error) {
    console.error('❌ 验证过程中发生错误:')
    if (error instanceof SyntaxError) {
      console.error(`JSON 格式错误: ${error.message}`)
    } else if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(String(error))
    }
    process.exitCode = 1
  }
}

const entryPath = process.argv[1]
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) main()
