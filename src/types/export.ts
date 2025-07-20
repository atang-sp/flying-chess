import type { BoardConfig, PunishmentConfig, TrapAction, BoardCell } from './game'
import type { PlayerSettings } from '../utils/cache'

// 导出数据版本
export const EXPORT_VERSION = '1.0.0'

// 导出选项
export interface ExportOptions {
  playerSettings: boolean
  punishmentConfig: boolean
  boardConfig: boolean
  trapConfig: boolean
  boardContent: boolean
}

// 棋盘内容（包含随机种子）
export interface BoardContent {
  seed: string // 随机种子
  board: BoardCell[] // 完整棋盘布局
  generatedAt: number // 生成时间戳
}

// 导出数据结构
export interface ExportData {
  version: string
  exportedAt: string // ISO 8601 格式
  gameTitle: string
  description?: string
  data: {
    playerSettings?: PlayerSettings
    punishmentConfig?: PunishmentConfig
    boardConfig?: BoardConfig
    trapConfig?: TrapAction[]
    boardContent?: BoardContent
  }
}

// 导出结果
export interface ExportResult {
  success: boolean
  data?: ExportData
  filename?: string
  error?: string
}

// 导入结果
export interface ImportResult {
  success: boolean
  data?: ExportData
  error?: string
  warnings?: string[]
}

// 导出格式
export type ExportFormat = 'json' | 'qrcode'

// 导出统计信息
export interface ExportStats {
  totalSize: number // 字节数
  compressedSize?: number // 压缩后大小
  itemCount: number // 导出项目数量
  estimatedQRCodeSize?: number // 二维码预估大小
}
