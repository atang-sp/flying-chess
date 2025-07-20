import type {
  ExportOptions,
  ExportData,
  ExportResult,
  ImportResult,
  BoardContent,
  ExportStats,
} from '../types/export'
import { EXPORT_VERSION } from '../types/export'
import type { BoardCell } from '../types/game'
import { loadPlayerSettings, loadConfig } from './cache'

// 生成随机种子
function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 创建棋盘内容快照
export function createBoardSnapshot(board: BoardCell[]): BoardContent {
  return {
    seed: generateSeed(),
    board: JSON.parse(JSON.stringify(board)), // 深拷贝
    generatedAt: Date.now(),
  }
}

// 收集导出数据
export function collectExportData(options: ExportOptions, currentBoard?: BoardCell[]): ExportData {
  const data: ExportData['data'] = {}

  // 玩家设置
  if (options.playerSettings) {
    const playerSettings = loadPlayerSettings()
    if (playerSettings) {
      data.playerSettings = playerSettings
    }
  }

  // 配置数据
  const config = loadConfig()
  if (config) {
    if (options.punishmentConfig) {
      data.punishmentConfig = config.punishmentConfig
    }
    if (options.boardConfig) {
      data.boardConfig = config.boardConfig
    }
    if (options.trapConfig) {
      data.trapConfig = config.trapConfig
    }
  }

  // 棋盘内容
  if (options.boardContent && currentBoard) {
    data.boardContent = createBoardSnapshot(currentBoard)
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    gameTitle: '飞行棋配置',
    description: '游戏配置导出文件',
    data,
  }
}

// 生成导出文件名
export function generateExportFilename(options: ExportOptions): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  const parts = []

  if (options.playerSettings) parts.push('玩家')
  if (options.punishmentConfig) parts.push('惩罚')
  if (options.boardConfig) parts.push('棋盘')
  if (options.trapConfig) parts.push('机关')
  if (options.boardContent) parts.push('布局')

  const configType = parts.length > 0 ? parts.join('-') : '配置'
  return `飞行棋-${configType}-${timestamp}.json`
}

// 计算导出统计信息
export function calculateExportStats(data: ExportData): ExportStats {
  const jsonString = JSON.stringify(data, null, 2)
  const totalSize = new Blob([jsonString]).size

  let itemCount = 0
  if (data.data.playerSettings) itemCount++
  if (data.data.punishmentConfig) itemCount++
  if (data.data.boardConfig) itemCount++
  if (data.data.trapConfig) itemCount++
  if (data.data.boardContent) itemCount++

  return {
    totalSize,
    itemCount,
    estimatedQRCodeSize: Math.ceil(totalSize * 1.3), // 二维码大约增加30%大小
  }
}

// 导出为JSON文件
export function exportToJson(options: ExportOptions, currentBoard?: BoardCell[]): ExportResult {
  try {
    const data = collectExportData(options, currentBoard)
    const filename = generateExportFilename(options)

    // 创建下载链接
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    // 触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    return {
      success: true,
      data,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败',
    }
  }
}

// 验证导入数据
export function validateImportData(data: any): ImportResult {
  const warnings: string[] = []

  try {
    // 检查基本结构
    if (!data || typeof data !== 'object') {
      return { success: false, error: '无效的数据格式' }
    }

    if (!data.version) {
      warnings.push('缺少版本信息')
    } else if (data.version !== EXPORT_VERSION) {
      warnings.push(`版本不匹配，当前支持版本: ${EXPORT_VERSION}，文件版本: ${data.version}`)
    }

    if (!data.data || typeof data.data !== 'object') {
      return { success: false, error: '缺少配置数据' }
    }

    // 检查各个配置项的有效性
    const { data: configData } = data

    if (configData.playerSettings) {
      if (
        !configData.playerSettings.playerCount ||
        !Array.isArray(configData.playerSettings.playerNames)
      ) {
        warnings.push('玩家设置格式不正确')
      }
    }

    if (configData.punishmentConfig) {
      const required = ['tools', 'bodyParts', 'positions', 'minStrikes', 'maxStrikes']
      for (const field of required) {
        if (!(field in configData.punishmentConfig)) {
          warnings.push(`惩罚配置缺少字段: ${field}`)
        }
      }
    }

    if (configData.boardConfig) {
      const required = [
        'punishmentCells',
        'bonusCells',
        'reverseCells',
        'restCells',
        'restartCells',
        'trapCells',
        'totalCells',
      ]
      for (const field of required) {
        if (!(field in configData.boardConfig)) {
          warnings.push(`棋盘配置缺少字段: ${field}`)
        }
      }
    }

    if (configData.boardContent) {
      if (!configData.boardContent.board || !Array.isArray(configData.boardContent.board)) {
        warnings.push('棋盘内容格式不正确')
      }
    }

    return {
      success: true,
      data: data as ExportData,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '数据验证失败',
    }
  }
}

// 从JSON文件导入
export function importFromJson(file: File): Promise<ImportResult> {
  return new Promise(resolve => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        const result = validateImportData(data)
        resolve(result)
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : '文件解析失败',
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        error: '文件读取失败',
      })
    }

    reader.readAsText(file)
  })
}
