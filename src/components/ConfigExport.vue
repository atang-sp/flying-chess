<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import type { ExportOptions, ExportStats, QRCodeOptions } from '../types/export'
  import type { BoardCell } from '../types/game'
  import {
    exportToJson,
    exportToQRCode,
    importFromJson,
    importFromQRCode,
    calculateExportStats,
    collectExportData,
    generateQRCode,
    DEFAULT_QRCODE_OPTIONS,
  } from '../utils/export'
  import { loadPlayerSettings, loadConfig } from '../utils/cache'

  interface Props {
    currentBoard?: BoardCell[]
    visible: boolean
  }

  interface Emits {
    (e: 'close'): void
    (e: 'export-success', filename: string): void
    (e: 'export-error', error: string): void
    (e: 'import-success', message: string): void
    (e: 'import-error', error: string): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 当前模式：export 或 import
  const currentMode = ref<'export' | 'import'>('export')

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

  // 二维码相关
  const qrCodeDataURL = ref<string>('')
  const showQRCode = ref(false)
  const qrCodeOptions = ref<QRCodeOptions>({ ...DEFAULT_QRCODE_OPTIONS })

  // 导入相关
  const isImporting = ref(false)
  const importJsonText = ref('')
  const showImportDialog = ref(false)
  const showDocumentation = ref(false)

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

  const qrCapacityExceeded = computed(() => exportStats.value?.estimatedQRCodeSize === -1)

  const qrCapacityHint = computed(() => {
    if (!qrCapacityExceeded.value) {
      return ''
    }
    if (exportOptions.value.boardContent) {
      return '当前选择包含棋盘布局，二维码容量超限，请改用 JSON 导出。'
    }
    return '当前选择的数据超过二维码容量，请减少导出项后重试。'
  })

  const canGenerateQRCode = computed(() => canExport.value && !qrCapacityExceeded.value)

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

  // 执行JSON导出
  const handleExportJson = async () => {
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

  // 生成二维码预览
  const handleGenerateQRCode = async () => {
    if (!canGenerateQRCode.value) return

    isExporting.value = true

    try {
      const data = collectExportData(exportOptions.value, props.currentBoard)
      const qrCode = await generateQRCode(data, qrCodeOptions.value)
      qrCodeDataURL.value = qrCode
      showQRCode.value = true
    } catch (error) {
      emit('export-error', error instanceof Error ? error.message : '二维码生成失败')
    } finally {
      isExporting.value = false
    }
  }

  // 导出二维码
  const handleExportQRCode = async () => {
    if (!canExport.value) return

    isExporting.value = true

    try {
      const result = await exportToQRCode(
        exportOptions.value,
        props.currentBoard,
        qrCodeOptions.value
      )

      if (result.success && result.filename) {
        emit('export-success', result.filename)
        emit('close')
      } else {
        emit('export-error', result.error || '二维码导出失败')
      }
    } catch (error) {
      emit('export-error', error instanceof Error ? error.message : '二维码导出过程中发生错误')
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

  // 处理文件导入
  const handleFileImport = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    isImporting.value = true

    try {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        // JSON文件导入
        const text = await file.text()
        const result = importFromJson(text)

        if (result.success) {
          emit('import-success', '配置导入成功！')
          emit('close')
        } else {
          emit('import-error', result.error || '导入失败')
        }
      } else if (file.type.startsWith('image/')) {
        // 二维码图片导入
        const result = await importFromQRCode(file)

        if (result.success) {
          emit('import-success', '配置导入成功！')
          emit('close')
        } else {
          emit('import-error', result.error || '二维码导入失败')
        }
      } else {
        emit('import-error', '不支持的文件格式，请选择JSON文件或图片文件')
      }
    } catch (error) {
      emit('import-error', error instanceof Error ? error.message : '导入过程中发生错误')
    } finally {
      isImporting.value = false
      target.value = '' // 清空文件选择
    }
  }

  // 处理JSON文本导入
  const handleJsonTextImport = async () => {
    if (!importJsonText.value.trim()) {
      emit('import-error', '请输入配置数据')
      return
    }

    isImporting.value = true

    try {
      const result = importFromJson(importJsonText.value)

      if (result.success) {
        emit('import-success', '配置导入成功！')
        showImportDialog.value = false
        emit('close')
      } else {
        emit('import-error', result.error || '导入失败')
      }
    } catch (error) {
      emit('import-error', error instanceof Error ? error.message : '导入过程中发生错误')
    } finally {
      isImporting.value = false
    }
  }

  // 切换模式
  const switchMode = (mode: 'export' | 'import') => {
    currentMode.value = mode
    showQRCode.value = false
    showImportDialog.value = false
    qrCodeDataURL.value = ''
    importJsonText.value = ''
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
        <div class="header-content">
          <h3>{{ currentMode === 'export' ? '📤 导出配置' : '📥 导入配置' }}</h3>
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: currentMode === 'export' }"
              @click="switchMode('export')"
            >
              导出
            </button>
            <button
              class="mode-tab"
              :class="{ active: currentMode === 'import' }"
              @click="switchMode('import')"
            >
              导入
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button class="doc-btn" title="查看配置文档" @click="showDocumentation = true">📖</button>
          <button class="close-btn" @click="handleClose">✕</button>
        </div>
      </div>

      <div class="export-content">
        <!-- 导出模式 -->
        <div v-if="currentMode === 'export'">
          <div class="export-description">
            <p>选择要导出的配置项，可以生成JSON文件或二维码供分享或备份使用。</p>
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
                  <div class="option-desc">
                    当前棋盘的完整布局（包含随机种子，仅建议 JSON 导出）
                  </div>
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
              <div v-if="exportStats.estimatedQRCodeSize !== undefined" class="stat-item">
                <span class="stat-label">二维码大小</span>
                <span
                  class="stat-value"
                  :class="{ danger: exportStats.estimatedQRCodeSize === -1 }"
                >
                  {{
                    exportStats.estimatedQRCodeSize === -1
                      ? '超限'
                      : formatFileSize(exportStats.estimatedQRCodeSize)
                  }}
                </span>
              </div>
            </div>
            <p v-if="qrCapacityExceeded" class="qrcode-warning">{{ qrCapacityHint }}</p>
          </div>

          <!-- 二维码预览 -->
          <div v-if="showQRCode && qrCodeDataURL" class="qrcode-preview">
            <h4>二维码预览</h4>
            <div class="qrcode-container">
              <img :src="qrCodeDataURL" alt="配置二维码" class="qrcode-image" />
              <p class="qrcode-tip">扫描此二维码或保存图片以分享配置</p>
            </div>
          </div>
        </div>

        <!-- 导入模式 -->
        <div v-else-if="currentMode === 'import'">
          <div class="import-description">
            <p>支持导入JSON配置文件或二维码图片，也可以直接粘贴配置数据。</p>
          </div>

          <div class="import-methods">
            <div class="import-method">
              <h4>📁 文件导入</h4>
              <div class="file-upload">
                <input
                  id="import-file"
                  type="file"
                  accept=".json,image/*"
                  :disabled="isImporting"
                  class="file-input"
                  @change="handleFileImport"
                />
                <label for="import-file" class="file-label">
                  <span v-if="isImporting">导入中...</span>
                  <span v-else>选择JSON文件或二维码图片</span>
                </label>
              </div>
              <p class="method-desc">支持 .json 文件和二维码图片（PNG、JPG等格式）</p>
            </div>

            <div class="import-method">
              <h4>📝 文本导入</h4>
              <div class="text-import">
                <textarea
                  v-model="importJsonText"
                  placeholder="请粘贴配置数据（JSON格式）..."
                  class="json-textarea"
                  :disabled="isImporting"
                  rows="8"
                ></textarea>
                <button
                  class="import-text-btn"
                  :disabled="!importJsonText.trim() || isImporting"
                  @click="handleJsonTextImport"
                >
                  <span v-if="isImporting">导入中...</span>
                  <span v-else>导入配置</span>
                </button>
              </div>
              <p class="method-desc">直接粘贴从其他地方复制的配置数据</p>
            </div>
          </div>
        </div>
      </div>

      <div class="export-actions">
        <button class="cancel-btn" :disabled="isExporting || isImporting" @click="handleClose">
          取消
        </button>

        <!-- 导出模式按钮 -->
        <div v-if="currentMode === 'export'" class="export-buttons">
          <button
            class="export-btn secondary"
            :disabled="!canGenerateQRCode"
            :class="{ loading: isExporting }"
            @click="handleGenerateQRCode"
          >
            <span v-if="isExporting">生成中...</span>
            <span v-else>🔲 生成二维码</span>
          </button>
          <button
            class="export-btn"
            :disabled="!canExport"
            :class="{ loading: isExporting }"
            @click="handleExportJson"
          >
            <span v-if="isExporting">导出中...</span>
            <span v-else>📄 导出 JSON</span>
          </button>
          <button
            v-if="showQRCode"
            class="export-btn secondary"
            :disabled="!qrCodeDataURL || qrCapacityExceeded"
            @click="handleExportQRCode"
          >
            💾 保存二维码
          </button>
        </div>

        <!-- 导入模式提示 -->
        <div v-else-if="currentMode === 'import'" class="import-tip">
          <p>💡 请选择上方的导入方式来导入配置</p>
        </div>
      </div>
    </div>

    <!-- 配置文档对话框 -->
    <div v-if="showDocumentation" class="documentation-overlay">
      <div class="documentation-modal">
        <div class="documentation-header">
          <h3>📖 配置文档</h3>
          <button class="close-btn" @click="showDocumentation = false">✕</button>
        </div>
        <div class="documentation-content">
          <div class="doc-section">
            <h4>🎯 配置类型说明</h4>
            <ul>
              <li>
                <strong>玩家设置：</strong>
                包含玩家数量和姓名配置
              </li>
              <li>
                <strong>惩罚设置：</strong>
                包含工具、部位、姿势等惩罚相关配置
              </li>
              <li>
                <strong>棋盘设置：</strong>
                包含各种格子类型的数量配置
              </li>
              <li>
                <strong>机关设置：</strong>
                包含机关格子的配置和效果
              </li>
              <li>
                <strong>棋盘布局：</strong>
                包含完整的棋盘布局和随机种子
              </li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>📤 导出功能</h4>
            <ul>
              <li>
                <strong>JSON文件：</strong>
                适合完整配置的分享和备份
              </li>
              <li>
                <strong>二维码：</strong>
                适合快速分享简单配置，可扫描或保存图片
              </li>
              <li>支持选择性导出，只导出需要的配置项</li>
              <li>自动生成包含时间戳的文件名</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>📥 导入功能</h4>
            <ul>
              <li>
                <strong>文件导入：</strong>
                支持JSON文件和二维码图片
              </li>
              <li>
                <strong>文本导入：</strong>
                直接粘贴配置数据
              </li>
              <li>导入前会自动验证数据完整性</li>
              <li>导入时会自动备份当前配置</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>⚠️ 注意事项</h4>
            <ul>
              <li>导入配置会覆盖当前设置，请注意备份</li>
              <li>二维码适合小量数据，大配置建议使用JSON文件</li>
              <li>只导入来自可信来源的配置文件</li>
              <li>如果导入失败，可以尝试恢复备份配置</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>🔧 版本兼容性</h4>
            <p>
              当前配置版本：
              <code>1.0.0</code>
            </p>
            <p>支持向后兼容，新版本可以读取旧版本的配置文件。</p>
          </div>
        </div>
        <div class="documentation-footer">
          <button class="btn-primary" @click="showDocumentation = false">我知道了</button>
        </div>
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

  .header-content {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .export-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .mode-tabs {
    display: flex;
    background: #e5e7eb;
    border-radius: 8px;
    padding: 2px;
  }

  .mode-tab {
    background: none;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-tab.active {
    background: white;
    color: #1f2937;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .mode-tab:hover:not(.active) {
    color: #374151;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .doc-btn {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 16px;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .doc-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
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

  .stat-value.danger {
    color: #dc2626;
  }

  .qrcode-warning {
    margin: 12px 0 0 0;
    font-size: 13px;
    color: #dc2626;
    line-height: 1.4;
  }

  /* 二维码预览样式 */
  .qrcode-preview {
    background: #f8faff;
    border: 1px solid #e0e7ff;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
    text-align: center;
  }

  .qrcode-preview h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #1e40af;
  }

  .qrcode-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .qrcode-image {
    width: min(420px, 80vw);
    max-width: 80%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .qrcode-tip {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }

  /* 导入样式 */
  .import-description {
    margin-bottom: 24px;
  }

  .import-description p {
    margin: 0;
    color: #6b7280;
    line-height: 1.5;
  }

  .import-methods {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .import-method {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    background: white;
  }

  .import-method h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .method-desc {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: #6b7280;
  }

  .file-upload {
    margin-bottom: 8px;
  }

  .file-input {
    display: none;
  }

  .file-label {
    display: inline-block;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .file-label:hover {
    background: #2563eb;
  }

  .text-import {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .json-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    resize: vertical;
    min-height: 120px;
  }

  .json-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .import-text-btn {
    align-self: flex-start;
    padding: 10px 20px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .import-text-btn:hover:not(:disabled) {
    background: #059669;
  }

  .import-text-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-actions {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .export-buttons {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .import-tip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .import-tip p {
    margin: 0;
    color: #6b7280;
    font-style: italic;
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
    flex: 1;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: #3b82f6;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .export-btn.secondary {
    background: #6b7280;
  }

  .export-btn:hover:not(:disabled) {
    background: #2563eb;
  }

  .export-btn.secondary:hover:not(:disabled) {
    background: #4b5563;
  }

  .export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-btn.loading {
    background: #6b7280;
  }

  /* 文档对话框样式 */
  .documentation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
  }

  .documentation-modal {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .documentation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .documentation-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
  }

  .documentation-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .doc-section {
    margin-bottom: 24px;
  }

  .doc-section:last-child {
    margin-bottom: 0;
  }

  .doc-section h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .doc-section ul {
    margin: 0;
    padding-left: 20px;
  }

  .doc-section li {
    margin-bottom: 8px;
    line-height: 1.5;
    color: #374151;
  }

  .doc-section p {
    margin: 8px 0 0 0;
    line-height: 1.5;
    color: #374151;
  }

  .doc-section code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: #1f2937;
  }

  .documentation-footer {
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    text-align: center;
  }

  .btn-primary {
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    background: #2563eb;
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
