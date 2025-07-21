import type {
  ExportOptions,
  ExportData,
  ExportResult,
  ImportResult,
  BoardContent,
  ExportStats,
  QRCodeOptions,
  ImportOptions,
  ValidationResult,
} from '../types/export'
import { EXPORT_VERSION } from '../types/export'
import type { BoardCell } from '../types/game'
import { loadPlayerSettings, loadConfig, savePlayerSettings, saveConfig } from './cache'
import QRCode from 'qrcode'
import QrScanner from 'qr-scanner'

// 设置 QrScanner 的 worker 路径
// 在开发环境和生产环境中都能正确找到 worker 文件
const workerPath = import.meta.env.DEV
  ? '/qr-scanner-worker.min.js'
  : '/flying-chess/qr-scanner-worker.min.js'

QrScanner.WORKER_PATH = workerPath

// 生成随机种子
function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 简化的二维码解析函数
async function parseQRCodeWithQrScanner(file: File): Promise<string> {
  console.log('开始使用 qr-scanner 解析二维码...', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    workerPath: QrScanner.WORKER_PATH,
  })

  // 尝试多种解析方法
  const methods = [
    // 方法1: 基本解析
    async () => {
      console.log('尝试方法1: 基本解析')
      return await QrScanner.scanImage(file, { returnDetailedScanResult: false })
    },

    // 方法2: 禁用高亮
    async () => {
      console.log('尝试方法2: 禁用高亮')
      return await QrScanner.scanImage(file, {
        returnDetailedScanResult: false,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      })
    },

    // 方法3: 无选项
    async () => {
      console.log('尝试方法3: 无选项')
      return await QrScanner.scanImage(file)
    },

    // 方法4: 使用Canvas预处理
    async () => {
      console.log('尝试方法4: Canvas预处理')
      const processedFile = await preprocessImageSimple(file)
      return await QrScanner.scanImage(processedFile, { returnDetailedScanResult: false })
    },
  ]

  let lastError: Error | null = null

  for (let i = 0; i < methods.length; i++) {
    try {
      const result = await methods[i]()
      console.log(`方法${i + 1}解析成功:`, {
        dataLength: result.length,
        preview: `${result.substring(0, 100)}...`,
      })
      return result
    } catch (error) {
      lastError = error as Error
      console.warn(`方法${i + 1}失败:`, error.message)
    }
  }

  // 所有方法都失败了
  console.error('所有解析方法都失败了')

  const errorMessage = lastError?.message || '未知错误'
  throw new Error(`无法从图片中识别二维码: ${errorMessage}。请确保图片清晰且包含有效的二维码。`)
}

// 简化的图片预处理
async function preprocessImageSimple(file: File): Promise<File> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        canvas.width = img.width
        canvas.height = img.height

        // 绘制原图
        ctx!.drawImage(img, 0, 0)

        // 转换为高对比度
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
          const value = gray > 128 ? 255 : 0
          data[i] = data[i + 1] = data[i + 2] = value
        }

        ctx!.putImageData(imageData, 0, 0)

        canvas.toBlob(blob => {
          if (blob) {
            resolve(new File([blob], 'processed.png', { type: 'image/png' }))
          } else {
            resolve(file) // 如果处理失败，返回原文件
          }
        }, 'image/png')
      } catch (error) {
        console.warn('图片预处理失败:', error)
        resolve(file) // 如果处理失败，返回原文件
      }
    }

    img.onerror = () => {
      console.warn('图片加载失败')
      resolve(file) // 如果加载失败，返回原文件
    }

    img.src = URL.createObjectURL(file)
  })
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
  const compressedString = JSON.stringify(data) // 压缩版本
  const totalSize = new Blob([jsonString]).size
  const compressedSize = new Blob([compressedString]).size

  let itemCount = 0
  if (data.data.playerSettings) itemCount++
  if (data.data.punishmentConfig) itemCount++
  if (data.data.boardConfig) itemCount++
  if (data.data.trapConfig) itemCount++
  if (data.data.boardContent) itemCount++

  // 二维码容量估算（基于QR Code标准）
  let estimatedQRCodeSize = compressedSize
  if (compressedSize > 2953) {
    // QR Code Version 40 最大容量
    estimatedQRCodeSize = -1 // 表示超出二维码容量
  }

  return {
    totalSize,
    compressedSize,
    itemCount,
    estimatedQRCodeSize,
  }
}

// 默认二维码选项
export const DEFAULT_QRCODE_OPTIONS: QRCodeOptions = {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  width: 512,
}

// 压缩JSON数据
function compressJsonData(data: ExportData): string {
  // 移除不必要的空格和换行
  const jsonString = JSON.stringify(data)

  // 如果数据太大，可以考虑进一步优化
  if (jsonString.length > 2000) {
    console.warn('配置数据较大，建议减少导出项目或使用JSON文件导出')
  }

  return jsonString
}

// 生成二维码
export async function generateQRCode(
  data: ExportData,
  options: Partial<QRCodeOptions> = {}
): Promise<string> {
  const qrOptions = { ...DEFAULT_QRCODE_OPTIONS, ...options }
  const jsonString = compressJsonData(data)

  // 根据数据大小自动调整错误纠正级别
  let errorCorrectionLevel = qrOptions.errorCorrectionLevel
  if (jsonString.length > 1500) {
    errorCorrectionLevel = 'L' // 大数据使用低错误纠正级别
  } else if (jsonString.length < 500) {
    errorCorrectionLevel = 'H' // 小数据使用高错误纠正级别
  }

  try {
    const qrCodeDataURL = await QRCode.toDataURL(jsonString, {
      errorCorrectionLevel,
      type: qrOptions.type,
      quality: qrOptions.quality,
      margin: qrOptions.margin,
      color: qrOptions.color,
      width: qrOptions.width,
    })
    return qrCodeDataURL
  } catch (error) {
    throw new Error(`二维码生成失败: ${error instanceof Error ? error.message : '未知错误'}`)
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

// 导出为二维码图片
export async function exportToQRCode(
  options: ExportOptions,
  currentBoard?: BoardCell[],
  qrOptions: Partial<QRCodeOptions> = {}
): Promise<ExportResult> {
  try {
    const data = collectExportData(options, currentBoard)
    const qrCodeDataURL = await generateQRCode(data, qrOptions)

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `飞行棋配置二维码-${timestamp}.png`

    // 创建下载链接
    const link = document.createElement('a')
    link.href = qrCodeDataURL
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return {
      success: true,
      data,
      filename,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '二维码导出失败',
    }
  }
}

// 验证导入数据
export function validateImportData(data: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // 检查基本结构
  if (!data || typeof data !== 'object') {
    errors.push('无效的数据格式')
    return { isValid: false, errors, warnings, suggestions }
  }

  // 检查版本
  if (!data.version) {
    warnings.push('缺少版本信息')
  } else if (data.version !== EXPORT_VERSION) {
    warnings.push(`版本不匹配，当前支持版本: ${EXPORT_VERSION}，文件版本: ${data.version}`)
  }

  // 检查数据字段
  if (!data.data || typeof data.data !== 'object') {
    errors.push('缺少配置数据')
    return { isValid: false, errors, warnings, suggestions }
  }

  const { data: configData } = data

  // 验证玩家设置
  if (configData.playerSettings) {
    const playerSettings = configData.playerSettings
    if (
      !playerSettings.playerCount ||
      playerSettings.playerCount < 2 ||
      playerSettings.playerCount > 4
    ) {
      errors.push('玩家数量必须在2-4之间')
    }
    if (
      !Array.isArray(playerSettings.playerNames) ||
      playerSettings.playerNames.length !== playerSettings.playerCount
    ) {
      errors.push('玩家姓名数量与玩家数量不匹配')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}

// 默认导入选项
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  validateData: true,
  mergeMode: 'replace',
  backupCurrent: true,
}

// 执行导入操作的通用函数
function performImport(data: ExportData, options: Partial<ImportOptions> = {}): ImportResult {
  const importOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options }

  try {
    // 备份当前配置
    if (importOptions.backupCurrent) {
      const currentPlayerSettings = loadPlayerSettings()
      const currentConfig = loadConfig()
      if (currentPlayerSettings || currentConfig) {
        const backupData = collectExportData(
          {
            playerSettings: !!currentPlayerSettings,
            punishmentConfig: !!currentConfig?.punishmentConfig,
            boardConfig: !!currentConfig?.boardConfig,
            trapConfig: !!currentConfig?.trapConfig,
            boardContent: false,
          },
          undefined
        )
        localStorage.setItem('flying-chess-config-backup', JSON.stringify(backupData))
      }
    }

    // 应用配置
    const { data: configData } = data
    const warnings: string[] = []

    console.log('开始应用配置数据:', configData)

    if (configData.playerSettings) {
      console.log('保存玩家设置:', configData.playerSettings)
      savePlayerSettings(configData.playerSettings)
      console.log('玩家设置已保存到localStorage')
    }

    if (configData.punishmentConfig || configData.boardConfig || configData.trapConfig) {
      const currentConfig = loadConfig() || {}
      const newConfig = { ...currentConfig }

      if (configData.punishmentConfig) {
        newConfig.punishmentConfig = configData.punishmentConfig
      }
      if (configData.boardConfig) {
        newConfig.boardConfig = configData.boardConfig
      }
      if (configData.trapConfig) {
        newConfig.trapConfig = configData.trapConfig
      }

      saveConfig(newConfig)
    }

    if (configData.boardContent) {
      warnings.push('棋盘布局数据已导入，但需要重新生成棋盘才能应用')
    }

    return {
      success: true,
      data,
      warnings,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
    }
  }
}

// 从JSON文件导入配置
export function importFromJson(
  jsonString: string,
  options: Partial<ImportOptions> = {}
): ImportResult {
  const importOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options }

  try {
    // 解析JSON
    const data = JSON.parse(jsonString)

    // 验证数据
    if (importOptions.validateData) {
      const validation = validateImportData(data)
      if (!validation.isValid) {
        return {
          success: false,
          error: `数据验证失败: ${validation.errors.join(', ')}`,
        }
      }
    }

    // 使用通用导入函数
    return performImport(data, options)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败',
    }
  }
}

// 从二维码导入配置
export async function importFromQRCode(
  imageFile: File,
  options: Partial<ImportOptions> = {}
): Promise<ImportResult> {
  console.log('开始二维码导入，文件信息:', {
    name: imageFile.name,
    type: imageFile.type,
    size: imageFile.size,
  })

  try {
    // 验证文件类型
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('请选择有效的图片文件')
    }

    // 使用 qr-scanner 解析二维码
    let qrCodeData: string
    try {
      console.log('开始解析二维码图片...')
      qrCodeData = await parseQRCodeWithQrScanner(imageFile)
      console.log('二维码解析成功，数据长度:', qrCodeData.length)
      console.log('二维码原始数据预览:', `${qrCodeData.substring(0, 200)}...`)
    } catch (scanError) {
      console.error('二维码扫描失败:', scanError)
      throw new Error(
        `无法从图片中识别二维码: ${scanError instanceof Error ? scanError.message : '未知错误'}。请确保图片清晰且包含有效的二维码。`
      )
    }

    // 解析二维码中的JSON数据
    let parsedData: unknown
    try {
      console.log('开始解析JSON数据...')
      parsedData = JSON.parse(qrCodeData)
      console.log('JSON解析成功，数据结构:', Object.keys(parsedData))
    } catch (parseError) {
      console.error('JSON解析失败:', parseError)
      console.log('原始数据:', qrCodeData)
      throw new Error(
        `二维码中的数据格式不正确: ${parseError instanceof Error ? parseError.message : '未知错误'}。请确保是有效的配置数据。`
      )
    }

    // 验证数据格式
    console.log('开始验证数据格式...')
    const validation = validateImportData(parsedData)
    if (!validation.isValid) {
      console.error('数据验证失败:', validation.errors)
      throw new Error(`配置数据验证失败：${validation.errors.join(', ')}`)
    }

    console.log('数据验证通过，开始执行导入...')
    // 执行导入
    const result = performImport(parsedData, options)
    console.log('导入完成，结果:', result)
    return result
  } catch (error) {
    console.error('二维码导入过程中发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '二维码导入失败',
    }
  }
}

// 恢复备份配置
export function restoreBackup(): ImportResult {
  try {
    const backupString = localStorage.getItem('flying-chess-config-backup')
    if (!backupString) {
      return {
        success: false,
        error: '没有找到备份配置',
      }
    }

    return importFromJson(backupString, { backupCurrent: false })
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '恢复备份失败',
    }
  }
}
