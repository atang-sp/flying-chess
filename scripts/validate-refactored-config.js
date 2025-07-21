#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 验证重构后的配置文件结构
 */
function validateRefactoredConfig() {
  const configPath = path.join(__dirname, '../configs/refactored-config-demo.json')

  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    console.log('🔍 开始验证重构后的配置文件...\n')

    // 验证基本结构
    if (!configData.data || !configData.data.punishmentConfig) {
      throw new Error('缺少 punishmentConfig 配置')
    }

    const punishmentConfig = configData.data.punishmentConfig

    // 验证工具配置
    console.log('✅ 验证工具配置:')
    if (typeof punishmentConfig.tools !== 'object' || Array.isArray(punishmentConfig.tools)) {
      throw new Error('tools 应该是对象而不是数组')
    }

    const toolNames = Object.keys(punishmentConfig.tools)
    console.log(`   - 工具数量: ${toolNames.length}`)
    console.log(`   - 工具列表: ${toolNames.join(', ')}`)

    // 验证每个工具的结构
    for (const [name, tool] of Object.entries(punishmentConfig.tools)) {
      if (typeof tool.intensity !== 'number' || typeof tool.ratio !== 'number') {
        throw new Error(`工具 "${name}" 缺少必要的 intensity 或 ratio 属性`)
      }
    }

    // 验证身体部位配置
    console.log('\n✅ 验证身体部位配置:')
    if (
      typeof punishmentConfig.bodyParts !== 'object' ||
      Array.isArray(punishmentConfig.bodyParts)
    ) {
      throw new Error('bodyParts 应该是对象而不是数组')
    }

    const bodyPartNames = Object.keys(punishmentConfig.bodyParts)
    console.log(`   - 身体部位数量: ${bodyPartNames.length}`)
    console.log(`   - 身体部位列表: ${bodyPartNames.join(', ')}`)

    // 验证姿势配置
    console.log('\n✅ 验证姿势配置:')
    if (
      typeof punishmentConfig.positions !== 'object' ||
      Array.isArray(punishmentConfig.positions)
    ) {
      throw new Error('positions 应该是对象而不是数组')
    }

    const positionNames = Object.keys(punishmentConfig.positions)
    console.log(`   - 姿势数量: ${positionNames.length}`)
    console.log(`   - 姿势列表: ${positionNames.join(', ')}`)

    // 验证游戏板数据中的引用
    console.log('\n✅ 验证游戏板数据中的引用:')
    if (!configData.data.boardContent || !configData.data.boardContent.board) {
      throw new Error('缺少游戏板数据')
    }

    const board = configData.data.boardContent.board
    let punishmentCells = 0
    let validReferences = 0
    const invalidReferences = []

    for (const cell of board) {
      if (cell.effect && cell.effect.punishment) {
        punishmentCells++
        const punishment = cell.effect.punishment

        // 验证工具引用
        if (punishment.tool && !punishmentConfig.tools[punishment.tool]) {
          invalidReferences.push(`位置 ${cell.position}: 无效的工具引用 "${punishment.tool}"`)
        }

        // 验证身体部位引用
        if (punishment.bodyPart && !punishmentConfig.bodyParts[punishment.bodyPart]) {
          invalidReferences.push(
            `位置 ${cell.position}: 无效的身体部位引用 "${punishment.bodyPart}"`
          )
        }

        // 验证姿势引用
        if (punishment.position && !punishmentConfig.positions[punishment.position]) {
          invalidReferences.push(`位置 ${cell.position}: 无效的姿势引用 "${punishment.position}"`)
        }

        if (
          punishment.tool &&
          punishment.bodyPart &&
          punishment.position &&
          punishmentConfig.tools[punishment.tool] &&
          punishmentConfig.bodyParts[punishment.bodyPart] &&
          punishmentConfig.positions[punishment.position]
        ) {
          validReferences++
        }
      }
    }

    console.log(`   - 惩罚格子总数: ${punishmentCells}`)
    console.log(`   - 有效引用数: ${validReferences}`)

    if (invalidReferences.length > 0) {
      console.log('\n❌ 发现无效引用:')
      invalidReferences.forEach(ref => console.log(`   - ${ref}`))
      throw new Error('存在无效引用')
    }

    // 计算文件大小优化
    const originalSize = fs.statSync(
      path.join(__dirname, '../configs/exported-config-demo.json')
    ).size
    const refactoredSize = fs.statSync(configPath).size

    console.log('\n📊 文件大小对比:')
    console.log(`   - 原始文件: ${(originalSize / 1024).toFixed(2)} KB`)
    console.log(`   - 重构文件: ${(refactoredSize / 1024).toFixed(2)} KB`)
    console.log(
      `   - 大小变化: ${refactoredSize === originalSize ? '相同' : `${(refactoredSize > originalSize ? '+' : '') + ((refactoredSize - originalSize) / 1024).toFixed(2)} KB`}`
    )

    console.log('\n🎉 配置文件验证通过！重构成功完成。')

    return true
  } catch (error) {
    console.error('❌ 验证失败:', error.message)
    return false
  }
}

// 运行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = validateRefactoredConfig()
  process.exit(success ? 0 : 1)
}

export { validateRefactoredConfig }
