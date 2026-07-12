<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { Skull, Trash2, Plus, Check, X, Info, RotateCcw } from '@lucide/vue'
  import type { TrapAction } from '../types/game'
  import { GAME_CONFIG } from '../config/gameConfig'
  import { GameService } from '../services/gameService'

  interface Props {
    traps: TrapAction[]
  }

  interface Emits {
    (e: 'update', traps: TrapAction[]): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 本地机关状态
  const localTraps = ref<TrapAction[]>([...props.traps])

  watch(
    () => props.traps,
    newTraps => {
      localTraps.value = [...newTraps]
    },
    { deep: true }
  )

  // 添加新机关
  const addTrap = () => {
    const newTrap: TrapAction = {
      name: `新机关${localTraps.value.length + 1}`,
      description: '请输入机关描述',
    }
    localTraps.value.push(newTrap)
    updateTraps()
  }

  // 删除机关
  const removeTrap = (index: number) => {
    localTraps.value.splice(index, 1)
    updateTraps()
  }

  // 更新机关
  const updateTraps = () => {
    emit('update', [...localTraps.value])
  }

  // 重置为默认值
  const resetToDefault = () => {
    localTraps.value = GameService.trapsToArray(GAME_CONFIG.DEFAULT_TRAPS)
    updateTraps()
  }

  // 检查配置是否有效
  const isConfigValid = computed(() => {
    return (
      localTraps.value.length > 0 &&
      localTraps.value.every(trap => trap.name.trim() !== '' && trap.description.trim() !== '')
    )
  })
</script>

<template>
  <div class="trap-config glass-card">
    <div class="config-section">
      <h3>
        <Skull :size="20" />
        机关格子配置
      </h3>
      <p class="section-description">
        自定义机关格子的内容。每次踩到机关格子时，会从所有机关中随机选择一个触发。
      </p>

      <!-- 机关列表 -->
      <div class="traps-list">
        <div v-for="(trap, index) in localTraps" :key="index" class="trap-item">
          <div class="trap-header">
            <h4>机关 {{ index + 1 }}</h4>
            <button
              class="btn-remove"
              :disabled="localTraps.length <= 1"
              @click="removeTrap(index)"
            >
              <Trash2 :size="16" />
            </button>
          </div>

          <div class="trap-content">
            <!-- 机关名称 -->
            <div class="input-group">
              <label class="input-label">机关名称</label>
              <input
                v-model="trap.name"
                type="text"
                class="config-input"
                placeholder="输入机关名称，例如：晾臀机关"
                @input="updateTraps"
              />
            </div>

            <!-- 机关描述 -->
            <div class="input-group">
              <label class="input-label">机关描述</label>
              <textarea
                v-model="trap.description"
                class="config-textarea"
                placeholder="输入机关描述，例如：晾臀5分钟"
                @input="updateTraps"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加机关按钮 -->
      <div class="add-trap-section">
        <button class="btn btn-primary" @click="addTrap">
          <Plus :size="18" />
          添加机关
        </button>
      </div>

      <!-- 状态显示 -->
      <div class="status-section">
        <div
          class="status-item"
          :class="{ 'status-error': !isConfigValid, 'status-success': isConfigValid }"
        >
          <span class="status-icon">
            <Check v-if="isConfigValid" :size="16" />
            <X v-else :size="16" />
          </span>
          <span class="status-text">配置状态：{{ isConfigValid ? '有效' : '无效' }}</span>
        </div>
        <div class="status-item status-info">
          <span class="status-icon"><Info :size="16" /></span>
          <span class="status-text">机关数量：{{ localTraps.length }} 个（等概率出现）</span>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <button class="btn btn-secondary" @click="resetToDefault">
          <RotateCcw :size="16" />
          重置默认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .trap-config {
    margin-bottom: 20px;
  }

  .trap-config:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .config-section h3 {
    color: var(--text-primary);
    margin: 0 0 10px 0;
    font-size: 1.2rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-description {
    color: var(--text-secondary);
    margin: 0 0 20px 0;
    font-size: 0.9rem;
  }

  .traps-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
  }

  .trap-item {
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    padding: 15px;
    border: var(--glass-border);
  }

  .trap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .trap-header h4 {
    color: var(--text-primary);
    margin: 0;
    font-size: 1rem;
  }

  .btn-remove {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    color: var(--color-danger);
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-remove:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.25);
  }

  .btn-remove:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .trap-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .input-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .config-input,
  .config-textarea {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    transition: border-color var(--transition-normal);
    font-family: inherit;
  }

  .config-input::placeholder,
  .config-textarea::placeholder {
    color: var(--text-muted);
  }

  .config-input:focus,
  .config-textarea:focus {
    border-color: var(--color-accent);
  }

  .config-textarea {
    min-height: 80px;
    resize: vertical;
  }

  .add-trap-section {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .status-section {
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    padding: 15px;
    margin-bottom: 20px;
    border: var(--glass-border);
  }

  .status-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    padding: 8px;
    border-radius: var(--radius-sm);
    transition: background-color var(--transition-normal);
  }

  .status-item:last-child {
    margin-bottom: 0;
  }

  .status-success {
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.25);
  }

  .status-error {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  .status-info {
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.25);
  }

  .status-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
  }

  .status-success .status-icon {
    color: var(--color-success);
  }

  .status-error .status-icon {
    color: var(--color-danger);
  }

  .status-info .status-icon {
    color: var(--color-info);
  }

  .status-text {
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .quick-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .trap-content {
      gap: 12px;
    }

    .quick-actions {
      flex-direction: column;
    }
  }
</style>
