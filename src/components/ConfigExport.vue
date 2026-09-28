<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import {
    Upload,
    Download,
    BookOpen,
    X,
    Users,
    Settings,
    Target,
    Wrench,
    Dices,
    FolderOpen,
    FileText,
    QrCode,
    FileJson,
    Save,
    Lightbulb,
    AlertTriangle,
  } from '@lucide/vue'
  import type { ExportOptions, ExportStats, QRCodeOptions } from '../types/export'
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
    visible: boolean
  }

  interface Emits {
    (e: 'close'): void
    (e: 'export-success', filename: string): void
    (e: 'export-error', error: string): void
    (e: 'import-will-apply'): void
    (e: 'import-success', message: string): void
    (e: 'import-error', error: string): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()
  const { t } = useI18n()

  const importSuccessMessage = (warnings?: string[]) =>
    [t('config_import_success_toast'), ...(warnings ?? [])].join('\n')

  // 当前模式：export 或 import
  const currentMode = ref<'export' | 'import'>('export')

  // 导出选项
  const exportOptions = ref<ExportOptions>({
    playerSettings: true,
    punishmentConfig: true,
    boardConfig: true,
    trapConfig: true,
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
    return t('config_export_qr_overflow')
  })

  const canGenerateQRCode = computed(() => canExport.value && !qrCapacityExceeded.value)

  // 监听选项变化，更新统计信息
  watch(
    () => exportOptions.value,
    () => {
      if (selectedCount.value > 0) {
        try {
          const data = collectExportData(exportOptions.value)
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
      const result = exportToJson(exportOptions.value)

      if (result.success && result.filename) {
        emit('export-success', result.filename)
        emit('close')
      } else {
        emit('export-error', result.error || t('config_export_error_failed'))
      }
    } catch (error) {
      emit(
        'export-error',
        error instanceof Error ? error.message : t('config_export_error_general')
      )
    } finally {
      isExporting.value = false
    }
  }

  // 生成二维码预览
  const handleGenerateQRCode = async () => {
    if (!canGenerateQRCode.value) return

    isExporting.value = true

    try {
      const data = collectExportData(exportOptions.value)
      const qrCode = await generateQRCode(data, qrCodeOptions.value)
      qrCodeDataURL.value = qrCode
      showQRCode.value = true
    } catch (error) {
      emit('export-error', error instanceof Error ? error.message : t('config_export_error_qrcode'))
    } finally {
      isExporting.value = false
    }
  }

  // 导出二维码
  const handleExportQRCode = async () => {
    if (!canExport.value) return

    isExporting.value = true

    try {
      const result = await exportToQRCode(exportOptions.value, qrCodeOptions.value)

      if (result.success && result.filename) {
        emit('export-success', result.filename)
        emit('close')
      } else {
        emit('export-error', result.error || t('config_export_error_qrcode_export'))
      }
    } catch (error) {
      emit(
        'export-error',
        error instanceof Error ? error.message : t('config_export_error_qrcode_general')
      )
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
      }
    } else {
      // 全选（只选择可用的）
      exportOptions.value = {
        playerSettings: available.playerSettings,
        punishmentConfig: available.punishmentConfig,
        boardConfig: available.boardConfig,
        trapConfig: available.trapConfig,
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
        const result = importFromJson(text, {}, () => emit('import-will-apply'))

        if (result.success) {
          emit('import-success', importSuccessMessage(result.warnings))
          emit('close')
        } else {
          emit('import-error', result.error || t('config_import_error_failed'))
        }
      } else if (file.type.startsWith('image/')) {
        // 二维码图片导入
        const result = await importFromQRCode(file, {}, () => emit('import-will-apply'))

        if (result.success) {
          emit('import-success', importSuccessMessage(result.warnings))
          emit('close')
        } else {
          emit('import-error', result.error || t('config_import_error_qrcode'))
        }
      } else {
        emit('import-error', t('config_import_error_unsupported_format'))
      }
    } catch (error) {
      emit(
        'import-error',
        error instanceof Error ? error.message : t('config_import_error_general')
      )
    } finally {
      isImporting.value = false
      target.value = '' // 清空文件选择
    }
  }

  // 处理JSON文本导入
  const handleJsonTextImport = async () => {
    if (!importJsonText.value.trim()) {
      emit('import-error', t('config_import_error_empty_data'))
      return
    }

    isImporting.value = true

    try {
      const result = importFromJson(importJsonText.value, {}, () => emit('import-will-apply'))

      if (result.success) {
        emit('import-success', importSuccessMessage(result.warnings))
        showImportDialog.value = false
        emit('close')
      } else {
        emit('import-error', result.error || t('config_import_error_failed'))
      }
    } catch (error) {
      emit(
        'import-error',
        error instanceof Error ? error.message : t('config_import_error_general')
      )
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
          <h3>
            <Upload v-if="currentMode === 'export'" :size="20" />
            <Download v-else :size="20" />
            {{
              currentMode === 'export'
                ? $t('config_export_title')
                : $t('config_export_import_title')
            }}
          </h3>
          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: currentMode === 'export' }"
              @click="switchMode('export')"
            >
              {{ $t('config_export_btn') }}
            </button>
            <button
              class="mode-tab"
              :class="{ active: currentMode === 'import' }"
              @click="switchMode('import')"
            >
              {{ $t('config_export_import_btn') }}
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="doc-btn"
            :title="$t('config_export_docs_link')"
            @click="showDocumentation = true"
          >
            <BookOpen :size="18" />
          </button>
          <button class="close-btn" @click="handleClose">
            <X :size="20" />
          </button>
        </div>
      </div>

      <div class="export-content">
        <!-- 导出模式 -->
        <div v-if="currentMode === 'export'">
          <div class="export-description">
            <p>{{ $t('config_export_desc') }}</p>
          </div>

          <div class="export-options">
            <div class="options-header">
              <h4>{{ $t('config_export_select_title') }}</h4>
              <button class="toggle-all-btn" @click="toggleAll">
                {{
                  Object.values(exportOptions).every(Boolean)
                    ? $t('config_export_select_none')
                    : $t('config_export_select_all')
                }}
              </button>
            </div>

            <div class="option-list">
              <label class="option-item" :class="{ disabled: !availableOptions.playerSettings }">
                <input
                  v-model="exportOptions.playerSettings"
                  type="checkbox"
                  :disabled="!availableOptions.playerSettings"
                />
                <span class="option-icon"><Users :size="20" /></span>
                <div class="option-info">
                  <div class="option-title">{{ $t('config_export_players_label') }}</div>
                  <div class="option-desc">{{ $t('config_export_players_desc') }}</div>
                </div>
                <div v-if="!availableOptions.playerSettings" class="option-status">
                  {{ $t('config_export_players_empty') }}
                </div>
              </label>

              <label class="option-item" :class="{ disabled: !availableOptions.punishmentConfig }">
                <input
                  v-model="exportOptions.punishmentConfig"
                  type="checkbox"
                  :disabled="!availableOptions.punishmentConfig"
                />
                <span class="option-icon"><Settings :size="20" /></span>
                <div class="option-info">
                  <div class="option-title">{{ $t('config_export_punishment_label') }}</div>
                  <div class="option-desc">{{ $t('config_export_punishment_desc') }}</div>
                </div>
                <div v-if="!availableOptions.punishmentConfig" class="option-status">
                  {{ $t('config_export_players_empty') }}
                </div>
              </label>

              <label class="option-item" :class="{ disabled: !availableOptions.boardConfig }">
                <input
                  v-model="exportOptions.boardConfig"
                  type="checkbox"
                  :disabled="!availableOptions.boardConfig"
                />
                <span class="option-icon"><Target :size="20" /></span>
                <div class="option-info">
                  <div class="option-title">{{ $t('config_export_board_label') }}</div>
                  <div class="option-desc">{{ $t('board_config_desc', { n: '' }) }}</div>
                </div>
                <div v-if="!availableOptions.boardConfig" class="option-status">
                  {{ $t('config_export_players_empty') }}
                </div>
              </label>

              <label class="option-item" :class="{ disabled: !availableOptions.trapConfig }">
                <input
                  v-model="exportOptions.trapConfig"
                  type="checkbox"
                  :disabled="!availableOptions.trapConfig"
                />
                <span class="option-icon"><Wrench :size="20" /></span>
                <div class="option-info">
                  <div class="option-title">{{ $t('trap_config_title') }}</div>
                  <div class="option-desc">{{ $t('trap_config_desc') }}</div>
                </div>
                <div v-if="!availableOptions.trapConfig" class="option-status">
                  {{ $t('config_export_players_empty') }}
                </div>
              </label>

              <div class="option-item disabled" aria-disabled="true">
                <span class="option-icon"><Dices :size="20" /></span>
                <div class="option-info">
                  <div class="option-title">{{ $t('config_export_layout_title') }}</div>
                  <div class="option-desc">{{ $t('config_export_layout_desc') }}</div>
                </div>
                <div class="option-status">{{ $t('config_export_unsupported') }}</div>
              </div>
            </div>
          </div>

          <div v-if="exportStats" class="export-stats">
            <h4>{{ $t('config_export_info_title') }}</h4>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">{{ $t('config_export_stat_items') }}</span>
                <span class="stat-value">
                  {{ $t('config_export_item_format', { count: exportStats.itemCount }) }}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ $t('config_export_stat_file_size') }}</span>
                <span class="stat-value">{{ formatFileSize(exportStats.totalSize) }}</span>
              </div>
              <div v-if="exportStats.estimatedQRCodeSize !== undefined" class="stat-item">
                <span class="stat-label">{{ $t('config_export_stat_qr_size') }}</span>
                <span
                  class="stat-value"
                  :class="{ danger: exportStats.estimatedQRCodeSize === -1 }"
                >
                  {{
                    exportStats.estimatedQRCodeSize === -1
                      ? $t('config_export_stat_exceeded')
                      : formatFileSize(exportStats.estimatedQRCodeSize)
                  }}
                </span>
              </div>
            </div>
            <p v-if="qrCapacityExceeded" class="qrcode-warning">{{ qrCapacityHint }}</p>
          </div>

          <!-- 二维码预览 -->
          <div v-if="showQRCode && qrCodeDataURL" class="qrcode-preview">
            <h4>{{ $t('config_export_qr_preview') }}</h4>
            <div class="qrcode-container">
              <img :src="qrCodeDataURL" alt="QR Code" class="qrcode-image" />
              <p class="qrcode-tip">{{ $t('config_export_qr_tip') }}</p>
            </div>
          </div>
        </div>

        <!-- 导入模式 -->
        <div v-else-if="currentMode === 'import'">
          <div class="import-description">
            <p>{{ $t('config_export_import_desc') }}</p>
          </div>

          <div class="import-methods">
            <div class="import-method">
              <h4>
                <FolderOpen :size="18" />
                {{ $t('config_export_file_import') }}
              </h4>
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
                  <span v-if="isImporting">{{ $t('config_export_importing') }}</span>
                  <span v-else>{{ $t('config_export_select_file') }}</span>
                </label>
              </div>
              <p class="method-desc">{{ $t('config_export_file_hint') }}</p>
            </div>

            <div class="import-method">
              <h4>
                <FileText :size="18" />
                {{ $t('config_export_text_import') }}
              </h4>
              <div class="text-import">
                <textarea
                  v-model="importJsonText"
                  :placeholder="$t('config_export_text_placeholder')"
                  class="json-textarea"
                  :disabled="isImporting"
                  rows="8"
                ></textarea>
                <button
                  class="btn btn-success import-text-btn"
                  :disabled="!importJsonText.trim() || isImporting"
                  @click="handleJsonTextImport"
                >
                  <span v-if="isImporting">{{ $t('config_export_importing') }}</span>
                  <span v-else>{{ $t('config_export_import_btn') }}</span>
                </button>
              </div>
              <p class="method-desc">{{ $t('config_export_text_hint') }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="export-actions">
        <button
          class="btn btn-secondary cancel-btn"
          :disabled="isExporting || isImporting"
          @click="handleClose"
        >
          {{ $t('config_export_cancel') }}
        </button>

        <!-- 导出模式按钮 -->
        <div v-if="currentMode === 'export'" class="export-buttons">
          <button
            class="btn btn-secondary export-btn"
            :disabled="!canGenerateQRCode"
            :class="{ loading: isExporting }"
            @click="handleGenerateQRCode"
          >
            <span v-if="isExporting">{{ $t('config_export_generating') }}</span>
            <span v-else class="btn-content">
              <QrCode :size="16" />
              {{ $t('config_export_generate_qr') }}
            </span>
          </button>
          <button
            class="btn btn-primary export-btn"
            :disabled="!canExport"
            :class="{ loading: isExporting }"
            @click="handleExportJson"
          >
            <span v-if="isExporting">{{ $t('config_export_generating') }}</span>
            <span v-else class="btn-content">
              <FileJson :size="16" />
              {{ $t('config_export_download_json') }}
            </span>
          </button>
          <button
            v-if="showQRCode"
            class="btn btn-secondary export-btn"
            :disabled="!qrCodeDataURL || qrCapacityExceeded"
            @click="handleExportQRCode"
          >
            <span class="btn-content">
              <Save :size="16" />
              {{ $t('config_export_save_qr') }}
            </span>
          </button>
        </div>

        <!-- 导入模式提示 -->
        <div v-else-if="currentMode === 'import'" class="import-tip">
          <p class="tip-content">
            <Lightbulb :size="16" />
            {{ $t('config_export_import_tip') }}
          </p>
        </div>
      </div>
    </div>

    <!-- 配置文档对话框 -->
    <div v-if="showDocumentation" class="documentation-overlay">
      <div class="documentation-modal">
        <div class="documentation-header">
          <h3>
            <BookOpen :size="20" />
            {{ $t('config_export_doc_title') }}
          </h3>
          <button class="close-btn" @click="showDocumentation = false">
            <X :size="20" />
          </button>
        </div>
        <div class="documentation-content">
          <div class="doc-section">
            <h4>
              <Target :size="18" />
              {{ $t('config_export_doc_type_title') }}
            </h4>
            <ul>
              <li>
                <strong>{{ $t('config_export_doc_players') }}</strong>
                {{ $t('config_export_doc_players_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_punishments') }}</strong>
                {{ $t('config_export_doc_punishments_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_board') }}</strong>
                {{ $t('config_export_doc_board_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_traps') }}</strong>
                {{ $t('config_export_doc_traps_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_layout') }}</strong>
                {{ $t('config_export_doc_layout_desc') }}
              </li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>
              <Upload :size="18" />
              {{ $t('config_export_doc_export_title') }}
            </h4>
            <ul>
              <li>
                <strong>{{ $t('config_export_doc_json') }}</strong>
                {{ $t('config_export_doc_json_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_qr') }}</strong>
                {{ $t('config_export_doc_qr_desc') }}
              </li>
              <li>{{ $t('config_export_doc_selective') }}</li>
              <li>{{ $t('config_export_doc_timestamp') }}</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>
              <Download :size="18" />
              {{ $t('config_export_doc_import_title') }}
            </h4>
            <ul>
              <li>
                <strong>{{ $t('config_export_doc_file_import') }}</strong>
                {{ $t('config_export_doc_file_import_desc') }}
              </li>
              <li>
                <strong>{{ $t('config_export_doc_text_import') }}</strong>
                {{ $t('config_export_doc_text_import_desc') }}
              </li>
              <li>{{ $t('config_export_doc_validate') }}</li>
              <li>{{ $t('config_export_doc_backup') }}</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>
              <AlertTriangle :size="18" />
              {{ $t('config_export_doc_notes_title') }}
            </h4>
            <ul>
              <li>{{ $t('config_export_doc_note_overwrite') }}</li>
              <li>{{ $t('config_export_doc_note_size') }}</li>
              <li>{{ $t('config_export_doc_note_trust') }}</li>
              <li>{{ $t('config_export_doc_note_recovery') }}</li>
            </ul>
          </div>

          <div class="doc-section">
            <h4>
              <Wrench :size="18" />
              {{ $t('config_export_doc_compat_title') }}
            </h4>
            <p>
              {{ $t('config_export_doc_version_label') }}
              <code>1.0.0</code>
            </p>
            <p>{{ $t('config_export_doc_compat_desc') }}</p>
          </div>
        </div>
        <div class="documentation-footer">
          <button class="btn btn-primary" @click="showDocumentation = false">
            {{ $t('config_export_doc_got_it') }}
          </button>
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
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .export-modal {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--glass-shadow-lg);
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
    border-bottom: var(--glass-border);
    background: var(--bg-surface);
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
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mode-tabs {
    display: flex;
    background: var(--bg-secondary);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 2px;
  }

  .mode-tab {
    background: none;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .mode-tab.active {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .mode-tab:hover:not(.active) {
    color: var(--text-secondary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .doc-btn {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .doc-btn:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
  }

  .close-btn {
    background: var(--bg-glass);
    border: var(--glass-border);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
  }

  .export-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .export-description,
  .import-description {
    margin-bottom: 24px;
  }

  .export-description p,
  .import-description p {
    margin: 0;
    color: var(--text-secondary);
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
    color: var(--text-primary);
  }

  .toggle-all-btn {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 6px 12px;
    font-size: 14px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .toggle-all-btn:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
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
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    background: var(--bg-glass);
  }

  .option-item:hover:not(.disabled) {
    border-color: rgba(102, 126, 234, 0.4);
    background: var(--bg-glass-hover);
  }

  .option-item.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-surface);
  }

  .option-item input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--color-accent);
  }

  .option-item.disabled input[type='checkbox'] {
    cursor: not-allowed;
  }

  .option-icon {
    flex-shrink: 0;
    color: var(--color-accent-light);
    display: flex;
    align-items: center;
  }

  .option-info {
    flex: 1;
  }

  .option-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .option-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .option-status {
    font-size: 12px;
    color: var(--color-danger);
    background: rgba(239, 68, 68, 0.1);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  .export-stats {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 24px;
  }

  .export-stats h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-accent-light);
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
    background: var(--bg-surface);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: var(--glass-border);
  }

  .stat-label {
    font-size: 14px;
    color: var(--text-muted);
  }

  .stat-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .stat-value.danger {
    color: var(--color-danger);
  }

  .qrcode-warning {
    margin: 12px 0 0 0;
    font-size: 13px;
    color: var(--color-danger);
    line-height: 1.4;
    background: rgba(239, 68, 68, 0.08);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .qrcode-preview {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-top: 16px;
    text-align: center;
  }

  .qrcode-preview h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-accent-light);
  }

  .qrcode-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--bg-primary);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 16px;
  }

  .qrcode-image {
    width: min(420px, 80vw);
    max-width: 80%;
    height: auto;
    border-radius: var(--radius-sm);
    box-shadow: var(--glass-shadow);
  }

  .qrcode-tip {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .import-methods {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .import-method {
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 20px;
    background: var(--bg-glass);
  }

  .import-method h4 {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .method-desc {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: var(--text-muted);
  }

  .file-upload {
    margin-bottom: 8px;
  }

  .file-input {
    display: none;
  }

  .file-label {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    background: linear-gradient(135deg, var(--color-accent) 0%, #764ba2 100%);
    color: white;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .file-label:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .text-import {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .json-textarea {
    width: 100%;
    padding: 12px;
    background: var(--bg-secondary);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: var(--text-primary);
    resize: vertical;
    min-height: 120px;
    transition: border-color var(--transition-fast);
  }

  .json-textarea::placeholder {
    color: var(--text-muted);
  }

  .json-textarea:focus {
    outline: none;
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
  }

  .json-textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .import-text-btn {
    align-self: flex-start;
  }

  .export-actions {
    display: flex;
    gap: 12px;
    padding: 20px 24px;
    border-top: var(--glass-border);
    background: var(--bg-surface);
  }

  .export-buttons {
    display: flex;
    gap: 8px;
    flex: 1;
  }

  .btn-content {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .import-tip {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tip-content {
    margin: 0;
    color: var(--text-secondary);
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cancel-btn {
    flex: 1;
  }

  .export-btn {
    flex: 1;
    font-size: 14px;
  }

  .export-btn.loading {
    opacity: 0.7;
  }

  /* 文档对话框样式 */
  .documentation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
  }

  .documentation-modal {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--glass-shadow-lg);
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
    border-bottom: var(--glass-border);
    background: var(--bg-surface);
  }

  .documentation-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
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
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .doc-section ul {
    margin: 0;
    padding-left: 20px;
  }

  .doc-section li {
    margin-bottom: 8px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .doc-section li strong {
    color: var(--text-primary);
  }

  .doc-section p {
    margin: 8px 0 0 0;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .doc-section code {
    background: var(--bg-glass);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: 'Courier New', monospace;
    font-size: 14px;
    color: var(--color-accent-light);
    border: var(--glass-border);
  }

  .documentation-footer {
    padding: 20px 24px;
    border-top: var(--glass-border);
    background: var(--bg-surface);
    text-align: center;
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

    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .export-actions {
      padding: 16px;
      flex-direction: column;
    }

    .export-buttons {
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
