<script setup lang="ts">
  import { Plane, Info } from '@lucide/vue'
  import type { PunishmentAction } from '../types/game'

  interface Props {
    visible: boolean
    punishment: PunishmentAction | null
    diceValue: number
    executorName: string
  }

  interface Emits {
    (e: 'confirm'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const handleConfirm = () => {
    emit('confirm')
  }
</script>

<template>
  <div v-if="visible" class="takeoff-punishment-overlay">
    <div class="takeoff-punishment-modal">
      <div class="punishment-header">
        <div class="punishment-icon">
          <Plane :size="48" />
        </div>
        <div class="punishment-title">未起飞惩罚</div>
      </div>

      <div class="punishment-content">
        <div class="punishment-description">
          掷到{{ diceValue }}点，未能起飞！需要被惩罚{{ punishment?.strikes ?? diceValue }}下。
        </div>

        <div v-if="punishment" class="punishment-details">
          <div v-if="executorName" class="detail-item">
            <span class="detail-label">执行者：</span>
            <span class="detail-value">{{ executorName }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">工具：</span>
            <span class="detail-value">{{ punishment.tool.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">部位：</span>
            <span class="detail-value">{{ punishment.bodyPart.name }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">姿势：</span>
            <span class="detail-value">{{ punishment.position.name }}</span>
          </div>
        </div>

        <div class="punishment-note">
          <div class="note-icon">
            <Info :size="20" />
          </div>
          <div class="note-text">只有掷到6点才能起飞。下次掷到6点前，每次掷骰子都会受到惩罚。</div>
        </div>
      </div>

      <div class="punishment-footer">
        <button class="confirm-btn" @click="handleConfirm">确认惩罚</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .takeoff-punishment-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    animation: fadeIn var(--transition-normal);
  }

  .takeoff-punishment-modal {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: var(--glass-shadow-lg);
    animation: slideIn var(--transition-normal);
  }

  .punishment-header {
    margin-bottom: 1.5rem;
  }

  .punishment-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    color: var(--color-punishment);
  }

  .punishment-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-punishment);
  }

  .punishment-content {
    margin-bottom: 2rem;
  }

  .punishment-description {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .punishment-details {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-weight: bold;
    color: var(--text-muted);
  }

  .detail-value {
    color: var(--text-primary);
    font-weight: bold;
  }

  .punishment-note {
    background: rgba(245, 158, 11, 0.1);
    border-radius: var(--radius-sm);
    padding: 1rem;
    border: 1px solid var(--color-warning);
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .note-icon {
    display: flex;
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--color-warning);
  }

  .note-text {
    font-size: 0.9rem;
    color: var(--color-warning);
    line-height: 1.4;
    text-align: left;
  }

  .punishment-footer {
    display: flex;
    justify-content: center;
  }

  .confirm-btn {
    background: linear-gradient(135deg, var(--color-punishment), #c0392b);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all var(--transition-normal);
  }

  .confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateY(-50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .takeoff-punishment-modal {
      padding: 1.5rem;
      margin: 1rem;
    }

    .punishment-icon :deep(svg) {
      width: 40px;
      height: 40px;
    }

    .punishment-title {
      font-size: 1.3rem;
    }

    .punishment-description {
      font-size: 1rem;
    }

    .detail-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .confirm-btn {
      padding: 0.6rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>
