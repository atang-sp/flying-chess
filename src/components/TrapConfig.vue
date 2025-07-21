<script setup lang="ts">
  import { ref, computed } from 'vue'
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
  <div class="trap-config">
    <div class="config-section">
      <h3>💀 机关格子配置</h3>
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
              🗑️
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
        <button class="btn-primary" @click="addTrap">
          <span class="btn-icon">➕</span>
          添加机关
        </button>
      </div>

      <!-- 状态显示 -->
      <div class="status-section">
        <div
          class="status-item"
          :class="{ 'status-error': !isConfigValid, 'status-success': isConfigValid }"
        >
          <span class="status-icon">{{ isConfigValid ? '✅' : '❌' }}</span>
          <span class="status-text">配置状态：{{ isConfigValid ? '有效' : '无效' }}</span>
        </div>
        <div class="status-item status-info">
          <span class="status-icon">ℹ️</span>
          <span class="status-text">机关数量：{{ localTraps.length }} 个（等概率出现）</span>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <button class="btn-secondary" @click="resetToDefault">
          <span class="btn-icon">🔄</span>
          重置默认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .trap-config {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    margin-bottom: 20px;
  }

  .config-section h3 {
    color: white;
    margin: 0 0 10px 0;
    font-size: 1.2rem;
    font-weight: bold;
  }

  .section-description {
    color: rgba(255, 255, 255, 0.8);
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
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .trap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .trap-header h4 {
    color: white;
    margin: 0;
    font-size: 1rem;
  }

  .btn-remove {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 4px;
    padding: 4px 8px;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-remove:hover:not(:disabled) {
    background: rgba(244, 67, 54, 0.3);
  }

  .btn-remove:disabled {
    opacity: 0.5;
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
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .config-input {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    color: white;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.3s;
  }

  .config-input:focus {
    border-color: #4caf50;
  }

  .config-textarea {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 8px 12px;
    color: white;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.3s;
  }

  .config-textarea:focus {
    border-color: #4caf50;
  }

  .add-trap-section {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4caf50, #45a049);
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    font-size: 0.9rem;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #45a049, #4caf50);
    transform: translateY(-1px);
  }

  .btn-icon {
    margin-right: 6px;
  }

  .status-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
  }

  .status-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 6px;
    transition: background-color 0.3s;
  }

  .status-item:last-child {
    margin-bottom: 0;
  }

  .status-success {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid rgba(76, 175, 80, 0.3);
  }

  .status-error {
    background: rgba(244, 67, 54, 0.2);
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .status-info {
    background: rgba(33, 150, 243, 0.2);
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  .status-icon {
    margin-right: 8px;
    font-size: 1rem;
  }

  .status-text {
    color: white;
    font-size: 0.9rem;
  }

  .quick-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 8px 16px;
    color: white;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    font-size: 0.85rem;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
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
