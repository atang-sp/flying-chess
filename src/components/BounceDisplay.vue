<script setup lang="ts">
  import { Undo2, Check, Trophy } from '@lucide/vue'

  interface Props {
    visible: boolean
    fromPosition: number
    targetPosition: number
    finalPosition: number
    overflowSteps: number
    endPoint: number // 终点位置
  }

  interface Emits {
    (e: 'confirm'): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()

  const confirmBounce = () => {
    emit('confirm')
  }
</script>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content bounce-display">
      <div class="bounce-header">
        <h3>
          <Undo2 :size="20" />
          反弹效果
        </h3>
        <p>超出终点，按飞行棋规则反弹！</p>
      </div>

      <div class="bounce-content">
        <div class="bounce-message">
          <p class="main-message">
            超出终点
            <Trophy :size="18" class="inline-icon" />
            (第{{ endPoint }}格) {{ overflowSteps }}格子，所以倒退{{
              overflowSteps
            }}格，最后是第{{ finalPosition }}格
          </p>
        </div>

        <div class="bounce-actions">
          <button class="btn btn-confirm" @click="confirmBounce">
            <Check :size="18" />
            确认反弹
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .bounce-display {
    max-width: 500px;
    border: 1px solid rgba(255, 165, 2, 0.3);
  }

  .bounce-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .bounce-header h3 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    color: var(--color-special);
    margin-bottom: 0.5rem;
  }

  .bounce-header p {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .bounce-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .bounce-message {
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border-radius: var(--radius-md);
    padding: 2rem;
    border: 1px solid rgba(255, 165, 2, 0.4);
    text-align: center;
    margin: 1rem 0;
  }

  .main-message {
    margin: 0;
    color: var(--color-special);
    font-weight: bold;
    font-size: 1.4rem;
    line-height: 1.5;
  }

  .inline-icon {
    display: inline-block;
    vertical-align: -3px;
    margin: 0 2px;
  }

  .bounce-actions {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .btn-confirm {
    background: linear-gradient(135deg, var(--color-special), #ff7675);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(255, 165, 2, 0.3);
  }

  .btn-confirm:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 165, 2, 0.4);
  }

  .btn-confirm:active {
    transform: translateY(0);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .bounce-display {
      padding: 1.5rem;
    }

    .bounce-message {
      padding: 1.5rem;
    }

    .main-message {
      font-size: 1.2rem;
    }
  }
</style>
