<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import type { ExportOptions, ExportStats } from '../types/export'
  import type { BoardCell } from '../types/game'
  import { exportToJson, calculateExportStats, collectExportData } from '../utils/export'
  import { loadPlayerSettings, loadConfig } from '../utils/cache'

  interface Props {
    currentBoard?: BoardCell[]
    visible: boolean
  }

  interface Emits {
    (e: 'close'): void
    (e: 'export-success', filename: string): void
    (e: 'export-error', error: string): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 导出选项
  const exportOptions = ref<ExportOptions>({
    playerSettings: true,
    punishmentConfig: true,
    boardConfig: true,
    trapConfig: true,
    boardContent: false,
  })

  // 导出状态
  const isExporting = ref(false)
  const exportStats = ref<ExportStats | null>(null)

  // 检查各配置项是否可用
  const availableOptions = computed(() => {
    const playerSettings = loadPlayerSettings()
    const config = loadConfig()

    return {
      playerSettings: !!playerSettings,
      punishmentConfig: !!config?.punishmentConfig,
      boardConfig: !!config?.boardConfig,
      trapConfig: !!config?.trapConfig,
      boardContent: !!props.currentBoard && props.currentBoard.length > 0,
    }
  })

  // 计算选中的配置项数量
  const selectedCount = computed(() => {
    return Object.values(exportOptions.value).filter(Boolean).length
  })

  // 是否可以导出
  const canExport = computed(() => {
    return selectedCount.value > 0 && !isExporting.value
  })

  // 监听选项变化，更新统计信息
  watch(
    () => [exportOptions.value, props.currentBoard],
    () => {
      if (selectedCount.value > 0) {
        try {
          const data = collectExportData(exportOptions.value, props.currentBoard)
          exportStats.value = calculateExportStats(data)
        } catch (error) {
          exportStats.value = null
        }
      } else {
        exportStats.value = null
      }
    },
    { deep: true, immediate: true }
  )

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 执行导出
  const handleExport = async () => {
    if (!canExport.value) return

    isExporting.value = true

    try {
      const result = exportToJson(exportOptions.value, props.currentBoard)

      if (result.success && result.filename) {
        emit('export-success', result.filename)
        emit('close')
      } else {
        emit('export-error', result.error || '导出失败')
      }
    } catch (error) {
      emit('export-error', error instanceof Error ? error.message : '导出过程中发生错误')
    } finally {
      isExporting.value = false
    }
  }

  // 全选/全不选
  const toggleAll = () => {
    const allSelected = Object.values(exportOptions.value).every(Boolean)
    const available = availableOptions.value

    if (allSelected) {
      // 全不选
      exportOptions.value = {
        playerSettings: false,
        punishmentConfig: false,
        boardConfig: false,
        trapConfig: false,
        boardContent: false,
      }
    } else {
      // 全选（只选择可用的）
      exportOptions.value = {
        playerSettings: available.playerSettings,
        punishmentConfig: available.punishmentConfig,
        boardConfig: available.boardConfig,
        trapConfig: available.trapConfig,
        boardContent: available.boardContent,
      }
    }
  }

  // 关闭对话框
  const handleClose = () => {
    emit('close')
  }
</script>

<template>
  <div v-if="visible" class="export-overlay">
    <div class="export-modal">
      <div class="export-header">
        <h3>📤 导出配置</h3>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="export-content">
        <div class="export-description">
          <p>选择要导出的配置项，将生成一个JSON文件供分享或备份使用。</p>
        </div>

        <div class="export-options">
          <div class="options-header">
            <h4>选择导出内容</h4>
            <button class="toggle-all-btn" @click="toggleAll">
              {{ Object.values(exportOptions).every(Boolean) ? '全不选' : '全选' }}
            </button>
          </div>

          <div class="option-list">
            <label class="option-item" :class="{ disabled: !availableOptions.playerSettings }">
              <input
                v-model="exportOptions.playerSettings"
                type="checkbox"
                :disabled="!availableOptions.playerSettings"
              />
              <span class="option-icon">👥</span>
              <div class="option-info">
                <div class="option-title">玩家设置</div>
                <div class="option-desc">玩家数量和姓名配置</div>
              </div>
              <div v-if="!availableOptions.playerSettings" class="option-status">未配置</div>
            </label>

            <label class="option-item" :class="{ disabled: !availableOptions.punishmentConfig }">
              <input
                v-model="exportOptions.punishmentConfig"
                type="checkbox"
                :disabled="!availableOptions.punishmentConfig"
              />
              <span class="option-icon">⚙️</span>
              <div class="option-info">
                <div class="option-title">惩罚设置</div>
                <div class="option-desc">工具、部位、姿势等惩罚配置</div>
              </div>
              <div v-if="!availableOptions.punishmentConfig" class="option-status">未配置</div>
            </label>

            <label class="option-item" :class="{ disabled: !availableOptions.boardConfig }">
              <input
                v-model="exportOptions.boardConfig"
                type="checkbox"
                :disabled="!availableOptions.boardConfig"
              />
              <span class="option-icon">🎯</span>
              <div class="option-info">
                <div class="option-title">棋盘设置</div>
                <div class="option-desc">各种格子数量的配置</div>
              </div>
              <div v-if="!availableOptions.boardConfig" class="option-status">未配置</div>
            </label>

            <label class="option-item" :class="{ disabled: !availableOptions.trapConfig }">
              <input
                v-model="exportOptions.trapConfig"
                type="checkbox"
                :disabled="!availableOptions.trapConfig"
              />
              <span class="option-icon">🔧</span>
              <div class="option-info">
                <div class="option-title">机关设置</div>
                <div class="option-desc">机关格子的配置</div>
              </div>
              <div v-if="!availableOptions.trapConfig" class="option-status">未配置</div>
            </label>

            <label class="option-item" :class="{ disabled: !availableOptions.boardContent }">
              <input
                v-model="exportOptions.boardContent"
                type="checkbox"
                :disabled="!availableOptions.boardContent"
              />
              <span class="option-icon">🎲</span>
              <div class="option-info">
                <div class="option-title">棋盘布局</div>
                <div class="option-desc">当前棋盘的完整布局（包含随机种子）</div>
              </div>
              <div v-if="!availableOptions.boardContent" class="option-status">无棋盘</div>
            </label>
          </div>
        </div>

        <div v-if="exportStats" class="export-stats">
          <h4>导出信息</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">配置项数量</span>
              <span class="stat-value">{{ exportStats.itemCount }} 项</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">文件大小</span>
              <span class="stat-value">{{ formatFileSize(exportStats.totalSize) }}</span>
            </div>
            <div v-if="exportStats.estimatedQRCodeSize" class="stat-item">
              <span class="stat-label">二维码大小</span>
              <span class="stat-value">{{ formatFileSize(exportStats.estimatedQRCodeSize) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="export-actions">
        <button class="cancel-btn" :disabled="isExporting" @click="handleClose">取消</button>
        <button
          class="export-btn"
          :disabled="!canExport"
          :class="{ loading: isExporting }"
          @click="handleExport"
        >
          <span v-if="isExporting">导出中...</span>
          <span v-else>导出 JSON 文件</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .export-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .export-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .export-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .export-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .export-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .export-description {
    margin-bottom: 24px;
  }

  .export-description p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .export-options {
    margin-bottom: 24px;
  }

  .options-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .options-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .toggle-all-btn {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-all-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
  }

  .option-item:hover:not(.disabled) {
    border-color: #3b82f6;
    background: #f8faff;
  }

  .option-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f9fafb;
  }

  .option-item input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .option-item.disabled input[type='checkbox'] {
    cursor: not-allowed;
  }

  .option-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .option-info {
    flex: 1;
  }

  .option-title {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .option-desc {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.4;
  }

  .option-status {
    font-size: 12px;
    color: #ef4444;
    background: #fef2f2;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #fecaca;
  }

  .export-stats {
    background: #f8faff;
    border: 1px solid #e0e7ff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .export-stats h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e40af;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 14px;
    color: #6b7280;
  }

  .stat-value {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
  }

  .export-actions {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .cancel-btn {
    flex: 1;
    padding: 12px 24px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    color: #374151;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-btn {
    flex: 2;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .export-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-btn.loading {
    background: #6b7280;
  }

  @media (max-width: 640px) {
    .export-overlay {
      padding: 10px;
    }

    .export-modal {
      max-height: 95vh;
    }

    .export-content {
      padding: 16px;
    }

    .export-header {
      padding: 16px;
    }

    .export-actions {
      padding: 16px;
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .option-item {
      padding: 12px;
    }
  }
</style>
