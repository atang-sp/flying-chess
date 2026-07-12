<script setup lang="ts">
  import { ref } from 'vue'
  import { Target, Info, Trash2, RotateCcw, ArrowLeft, Check } from '@lucide/vue'
  import type { PunishmentCombination } from '../types/game'

  interface Props {
    show: boolean
    combinations: PunishmentCombination[]
  }

  interface Emits {
    (e: 'confirm', combinations: PunishmentCombination[]): void
    (e: 'regenerate'): void
    (e: 'back-to-settings'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const removedCombinations = ref<Set<number>>(new Set())

  const handleOverlayClick = () => {
    // 不允许点击遮罩关闭，必须确认或重新生成
  }

  const removeCombination = (index: number) => {
    removedCombinations.value.add(index)
  }

  const restoreCombination = (index: number) => {
    removedCombinations.value.delete(index)
  }

  const confirmCombinations = () => {
    const validCombinations = props.combinations.filter(
      (_, index) => !removedCombinations.value.has(index)
    )
    emit('confirm', validCombinations)
  }

  const regenerateCombinations = () => {
    removedCombinations.value.clear()
    emit('regenerate')
  }
</script>

<template>
  <div v-if="show" class="punishment-confirmation">
    <div class="modal-overlay confirmation-overlay" @click="handleOverlayClick">
      <div class="confirmation-modal" @click.stop>
        <div class="modal-header">
          <h3>
            <Target :size="22" />
            惩罚组合确认
          </h3>
          <p>请检查以下惩罚组合，可以删除不合适的组合</p>
          <p class="duplicate-notice">
            <Info :size="16" />
            相同工具+部位+姿势的组合已自动去重
          </p>
        </div>

        <div class="combinations-list">
          <div
            v-for="(combination, index) in combinations"
            :key="index"
            class="combination-item"
            :class="{ removed: removedCombinations.has(index) }"
          >
            <div class="combination-content">
              <div class="combination-number">#{{ index + 1 }}</div>
              <div class="combination-details">
                <div class="combination-tool">
                  <span class="label">工具:</span>
                  <span class="value">{{ combination.tool.name }}</span>
                  <span class="intensity">强度: {{ combination.tool.intensity }}/10</span>
                </div>
                <div class="combination-body-part">
                  <span class="label">部位:</span>
                  <span class="value">{{ combination.bodyPart.name }}</span>
                  <span class="sensitivity">耐受度: {{ combination.bodyPart.sensitivity }}/10</span>
                </div>
                <div class="combination-position">
                  <span class="label">姿势:</span>
                  <span class="value">{{ combination.position.name }}</span>
                </div>
              </div>
              <div class="combination-summary">
                <span class="summary-text">{{ combination.description }}</span>
              </div>
            </div>

            <div class="combination-actions">
              <button
                v-if="!removedCombinations.has(index)"
                class="btn-remove"
                title="删除此组合"
                @click="removeCombination(index)"
              >
                <Trash2 :size="18" />
              </button>
              <button
                v-else
                class="btn-restore"
                title="恢复此组合"
                @click="restoreCombination(index)"
              >
                <RotateCcw :size="18" />
              </button>
            </div>
          </div>
        </div>

        <div class="combination-stats">
          <div class="stat-item">
            <span class="stat-label">总组合数:</span>
            <span class="stat-value">{{ combinations.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已删除:</span>
            <span class="stat-value">{{ removedCombinations.size }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">保留组合:</span>
            <span class="stat-value">{{ combinations.length - removedCombinations.size }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="regenerateCombinations">
            <RotateCcw :size="18" />
            重新生成
          </button>
          <button class="btn btn-secondary" @click="() => emit('back-to-settings')">
            <ArrowLeft :size="18" />
            返回惩罚设置
          </button>
          <button
            class="btn btn-primary"
            :disabled="removedCombinations.size >= combinations.length"
            @click="confirmCombinations"
          >
            <Check :size="18" />
            确认组合 ({{ combinations.length - removedCombinations.size }}个)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .punishment-confirmation {
    position: fixed;
    inset: 0;
    z-index: 1000;
  }

  .confirmation-overlay {
    padding: 1rem;
  }

  .confirmation-modal {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--glass-shadow-lg);
    padding: 0;
    animation: modalSlideIn 0.3s ease;
  }

  .modal-header {
    background: linear-gradient(135deg, var(--color-accent) 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    text-align: center;
  }

  .modal-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .modal-header p {
    margin: 0;
    font-size: 1rem;
    opacity: 0.9;
    color: rgba(255, 255, 255, 0.9);
  }

  .duplicate-notice {
    margin-top: 0.5rem !important;
    font-size: 0.9rem !important;
    opacity: 0.9 !important;
    color: var(--color-bonus) !important;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  .combinations-list {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    max-height: 60vh;
  }

  .combination-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: var(--glass-border);
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
    transition: all var(--transition-normal);
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
  }

  .combination-item:hover {
    border-color: rgba(102, 126, 234, 0.4);
    background: var(--bg-glass-hover);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  }

  .combination-item.removed {
    opacity: 0.5;
    background: var(--bg-surface);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .combination-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .combination-number {
    font-weight: bold;
    color: var(--color-accent-light);
    font-size: 0.9rem;
  }

  .combination-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .combination-tool,
  .combination-body-part,
  .combination-position {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .label {
    font-weight: bold;
    color: var(--text-secondary);
    min-width: 40px;
  }

  .value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .intensity,
  .sensitivity {
    background: var(--color-accent);
    color: white;
    padding: 0.2rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: bold;
  }

  .combination-summary {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-accent);
  }

  .summary-text {
    font-size: 0.9rem;
    color: var(--text-primary);
    font-weight: 500;
  }

  .combination-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-remove,
  .btn-restore {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-remove {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-danger);
  }

  .btn-remove:hover {
    background: rgba(239, 68, 68, 0.35);
    transform: scale(1.05);
  }

  .btn-restore {
    background: rgba(34, 197, 94, 0.2);
    color: var(--color-success);
  }

  .btn-restore:hover {
    background: rgba(34, 197, 94, 0.35);
    transform: scale(1.05);
  }

  .combination-stats {
    display: flex;
    justify-content: space-around;
    padding: 1rem;
    background: var(--bg-surface);
    border-top: var(--glass-border);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--color-accent-light);
  }

  .modal-actions {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--bg-surface);
    border-top: var(--glass-border);
  }

  .modal-actions .btn {
    flex: 1;
  }

  @media (max-width: 768px) {
    .confirmation-overlay {
      padding: 0.5rem;
    }

    .confirmation-modal {
      max-width: 100%;
      max-height: 95vh;
      border-radius: var(--radius-md);
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-header h3 {
      font-size: 1.3rem;
    }

    .modal-header p {
      font-size: 0.9rem;
    }

    .combinations-list {
      padding: 0.75rem;
      max-height: 60vh;
    }

    .combination-item {
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .combination-details {
      grid-template-columns: 1fr;
      gap: 0.25rem;
    }

    .combination-tool,
    .combination-body-part,
    .combination-position {
      font-size: 0.8rem;
    }

    .summary-text {
      font-size: 0.8rem;
    }

    .btn-remove,
    .btn-restore {
      width: 35px;
      height: 35px;
    }

    .combination-stats {
      padding: 0.75rem;
    }

    .stat-label {
      font-size: 0.7rem;
    }

    .stat-value {
      font-size: 1rem;
    }

    .modal-actions {
      padding: 1rem;
      gap: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .confirmation-overlay {
      padding: 0.25rem;
    }

    .confirmation-modal {
      max-height: 98vh;
      border-radius: var(--radius-sm);
    }

    .modal-header {
      padding: 0.75rem;
    }

    .modal-header h3 {
      font-size: 1.2rem;
    }

    .combinations-list {
      padding: 0.5rem;
      max-height: 65vh;
    }

    .combination-item {
      padding: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .combination-number {
      font-size: 0.8rem;
    }

    .combination-details {
      font-size: 0.75rem;
    }

    .modal-actions {
      padding: 0.75rem;
      flex-wrap: wrap;
    }
  }
</style>
