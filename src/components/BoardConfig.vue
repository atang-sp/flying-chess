<script setup lang="ts">
  import { ref, computed } from 'vue'
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
  <div class="board-config">
    <div class="config-section">
      <h3>🎯 棋盘格子配置</h3>
      <p class="section-description">
        设置游戏中各种类型格子的数量。总格子数：{{ localConfig.totalCells }}
      </p>

      <div class="config-grid">
        <!-- 总格子数 -->
        <div class="config-item">
          <label class="config-label">
            <span class="label-icon">📏</span>
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
            <span class="label-icon">⚡</span>
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
            <span class="label-icon">🎁</span>
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
            <span class="label-icon">⬅️</span>
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
            <span class="label-icon">🛌</span>
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
            <span class="label-icon">🔄</span>
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
            <span class="label-icon">💀</span>
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
          <span class="status-icon">{{ remainingCells >= 0 ? '✅' : '❌' }}</span>
          <span class="status-text">剩余可用格子：{{ remainingCells }} 格</span>
        </div>

        <div
          class="status-item"
          :class="{ 'status-error': !isConfigValid, 'status-success': isConfigValid }"
        >
          <span class="status-icon">{{ isConfigValid ? '✅' : '❌' }}</span>
          <span class="status-text">配置状态：{{ isConfigValid ? '有效' : '无效' }}</span>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="quick-actions">
        <button class="btn-secondary" @click="resetToDefault">
          <span class="btn-icon">🔄</span>
          重置默认
        </button>
        <button class="btn-secondary" @click="autoDistribute">
          <span class="btn-icon">🎯</span>
          自动分配
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .board-config {
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

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
  }

  .config-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .config-label {
    display: flex;
    align-items: center;
    color: white;
    font-weight: 500;
    margin-bottom: 10px;
    font-size: 0.95rem;
  }

  .label-icon {
    margin-right: 8px;
    font-size: 1.1rem;
  }

  .input-group {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .config-input {
    flex: 1;
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

  .config-input::-webkit-inner-spin-button,
  .config-input::-webkit-outer-spin-button {
    opacity: 1;
  }

  .input-unit {
    color: rgba(255, 255, 255, 0.7);
    margin-left: 8px;
    font-size: 0.85rem;
  }

  .cell-description {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    line-height: 1.3;
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

  .btn-icon {
    margin-right: 6px;
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
