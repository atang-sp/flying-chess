<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import {
    Target,
    Settings,
    AlertTriangle,
    Rocket,
    ArrowLeft,
    Info,
    RotateCcw,
    Skull,
    Check,
    X,
  } from '@lucide/vue'
  import type { BoardConfig } from '../types/game'
  import { GameService } from '../services/gameService'

  interface Props {
    config: BoardConfig
  }

  interface Emits {
    (e: 'update', config: BoardConfig): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  // 本地配置状态
  const localConfig = ref<BoardConfig>({ ...props.config })

  watch(
    () => props.config,
    (newConfig) => {
      localConfig.value = { ...newConfig }
    },
    { deep: true }
  )

  // 计算剩余可用格子数
  const remainingCells = computed(() => {
    const used =
      localConfig.value.punishmentCells +
      localConfig.value.bonusCells +
      localConfig.value.reverseCells +
      localConfig.value.restCells +
      localConfig.value.restartCells +
      localConfig.value.trapCells
    return localConfig.value.totalCells - 2 - used
  })

  // 检查配置是否有效
  const isConfigValid = computed(() => {
    return GameService.validateBoardConfig(localConfig.value)
  })

  // 更新配置
  const updateConfig = () => {
    if (isConfigValid.value) {
      emit('update', { ...localConfig.value })
    }
  }

  // 处理输入变化，自动调整后面格子
  const handleCellInput = (field: keyof BoardConfig) => {
    if (field === 'totalCells') {
      updateConfig()
      return
    }

    // 顺序：punishmentCells -> bonusCells -> reverseCells -> restCells -> restartCells -> trapCells
    const order: (keyof BoardConfig)[] = [
      'punishmentCells',
      'bonusCells',
      'reverseCells',
      'restCells',
      'restartCells',
      'trapCells',
    ]
    const idx = order.indexOf(field)
    if (idx === -1) return
    // 计算当前已用
    let used = 0
    for (let i = 0; i <= idx; i++) {
      used += Number(localConfig.value[order[i]])
    }
    // 如果超出总格子数，依次减少后面项
    const assignableCells = localConfig.value.totalCells - 2
    if (used > assignableCells) {
      let remain = used - assignableCells
      for (let i = idx + 1; i < order.length; i++) {
        const v = Number(localConfig.value[order[i]])
        if (v >= remain) {
          localConfig.value[order[i]] = v - remain
          remain = 0
          break
        } else {
          localConfig.value[order[i]] = 0
          remain -= v
        }
      }
    }
    updateConfig()
  }

  // 重置为默认值
  const resetToDefault = () => {
    localConfig.value = {
      punishmentCells: props.config.punishmentCells,
      bonusCells: props.config.bonusCells,
      reverseCells: props.config.reverseCells,
      restCells: props.config.restCells,
      restartCells: props.config.restartCells,
      trapCells: props.config.trapCells,
      totalCells: props.config.totalCells,
    }
    updateConfig()
  }

  // 自动分配格子
  const autoDistribute = () => {
    localConfig.value = GameService.createAutoBoardConfig(localConfig.value.totalCells)
    updateConfig()
  }
</script>

<template>
  <div class="board-config glass-card">
    <div class="config-section">
      <h3>
        <Target :size="20" />
        棋盘格子配置
      </h3>
      <p class="section-description">
        设置游戏中各种类型格子的数量。总格子数：{{ localConfig.totalCells }}
      </p>

      <div class="config-grid">
        <!-- 总格子数 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><Settings :size="18" /></span>
            总格子数
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.totalCells"
              type="number"
              min="20"
              max="100"
              class="config-input"
              @input="handleCellInput('totalCells')"
            />
            <span class="input-unit">格</span>
          </div>
        </div>

        <!-- 惩罚格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><AlertTriangle :size="18" /></span>
            惩罚格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.punishmentCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('punishmentCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">玩家踩到后需要接受惩罚的格子</div>
        </div>

        <!-- 奖励格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><Rocket :size="18" /></span>
            奖励格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.bonusCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('bonusCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">玩家踩到后可以前进的格子</div>
        </div>

        <!-- 后退格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><ArrowLeft :size="18" /></span>
            后退格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.reverseCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('reverseCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">后退的格子</div>
        </div>

        <!-- 休息格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><Info :size="18" /></span>
            休息格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.restCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('restCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">玩家踩到后需要休息的格子</div>
        </div>

        <!-- 回到起点格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><RotateCcw :size="18" /></span>
            回到起点格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.restartCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('restartCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">玩家踩到后需要回到起点的格子</div>
        </div>

        <!-- 机关格子 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon"><Skull :size="18" /></span>
            机关格子
          </label>
          <div class="input-group">
            <input
              v-model.number="localConfig.trapCells"
              type="number"
              min="0"
              :max="localConfig.totalCells"
              class="config-input"
              @input="handleCellInput('trapCells')"
            />
            <span class="input-unit">格</span>
          </div>
          <div class="cell-description">玩家踩到后随机触发机关惩罚的格子</div>
        </div>
      </div>

      <!-- 状态显示 -->
      <div class="status-section">
        <div
          class="status-item"
          :class="{ 'status-error': remainingCells < 0, 'status-success': remainingCells >= 0 }"
        >
          <span class="status-icon">
            <Check v-if="remainingCells >= 0" :size="16" />
            <X v-else :size="16" />
          </span>
          <span class="status-text">剩余可用格子：{{ remainingCells }} 格</span>
        </div>

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
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <button class="btn btn-secondary" @click="resetToDefault">
          <RotateCcw :size="16" />
          重置默认
        </button>
        <button class="btn btn-secondary" @click="autoDistribute">
          <Target :size="16" />
          自动分配
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .board-config {
    margin-bottom: 20px;
  }

  .board-config:hover {
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

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .config-item {
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    padding: 15px;
    border: var(--glass-border);
  }

  .config-label {
    display: flex;
    align-items: center;
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: 10px;
    font-size: 0.95rem;
  }

  .label-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
    color: var(--text-secondary);
  }

  .input-group {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .config-input {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    transition: border-color var(--transition-normal);
  }

  .config-input:focus {
    border-color: var(--color-accent);
  }

  .config-input::-webkit-inner-spin-button,
  .config-input::-webkit-outer-spin-button {
    opacity: 1;
  }

  .input-unit {
    color: var(--text-muted);
    margin-left: 8px;
    font-size: 0.85rem;
  }

  .cell-description {
    color: var(--text-muted);
    font-size: 0.8rem;
    line-height: 1.3;
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
    .config-grid {
      grid-template-columns: 1fr;
    }

    .quick-actions {
      flex-direction: column;
    }
  }
</style>
