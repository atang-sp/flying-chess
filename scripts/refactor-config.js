#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 重构配置文件，将 id/name 结构改为仅使用 name 作为键的结构
 */
function refactorConfig() {
  const configPath = path.join(__dirname, '../configs/exported-config-demo.json')

  // 读取原配置文件
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  // 重构惩罚配置部分已经完成，现在需要重构游戏板数据
  if (configData.data && configData.data.boardContent && configData.data.boardContent.board) {
    configData.data.boardContent.board.forEach(cell => {
      if (cell.effect && cell.effect.punishment) {
        const punishment = cell.effect.punishment

        // 重构工具引用
        if (punishment.tool && typeof punishment.tool === 'object' && punishment.tool.name) {
          punishment.tool = punishment.tool.name
        }

        // 重构身体部位引用
        if (
          punishment.bodyPart &&
          typeof punishment.bodyPart === 'object' &&
          punishment.bodyPart.name
        ) {
          punishment.bodyPart = punishment.bodyPart.name
        }

        // 重构姿势引用
        if (
          punishment.position &&
          typeof punishment.position === 'object' &&
          punishment.position.name
        ) {
          punishment.position = punishment.position.name
        }
      }
    })
  }

  // 写回文件
  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8')
  console.log('配置文件重构完成！')

  // 创建重构后的示例文件
  const refactoredPath = path.join(__dirname, '../configs/refactored-config-demo.json')
  fs.writeFileSync(refactoredPath, JSON.stringify(configData, null, 2), 'utf8')
  console.log('重构后的配置文件已保存到:', refactoredPath)
}

// 运行重构
if (import.meta.url === `file://${process.argv[1]}`) {
  refactorConfig()
}

export { refactorConfig }
