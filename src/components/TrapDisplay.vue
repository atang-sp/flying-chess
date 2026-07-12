<script setup lang="ts">
  import { Skull, AlertTriangle } from '@lucide/vue'

  interface Props {
    show: boolean
    trapDescription?: string
  }

  interface Emits {
    (e: 'confirm'): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()

  const handleConfirm = () => {
    emit('confirm')
  }

  const handleOverlayClick = () => {
    // 点击遮罩层不关闭弹窗，必须点击确认按钮
  }
</script>

<template>
  <div v-if="show" class="modal-overlay trap-display-overlay" @click="handleOverlayClick">
    <div class="trap-display-modal" @click.stop>
      <div class="trap-header">
        <div class="trap-icon">
          <Skull :size="48" />
        </div>
        <h2 class="trap-title">机关陷阱触发！</h2>
      </div>

      <div class="trap-content">
        <div class="trap-message">
          <p class="trap-description">{{ trapDescription }}</p>
        </div>

        <div class="trap-warning">
          <p>
            <AlertTriangle :size="18" />
            机关陷阱已触发，请按照描述执行！
          </p>
        </div>
      </div>

      <div class="trap-actions">
        <button class="btn trap-confirm-btn" @click="handleConfirm">
          <span class="btn-icon">
            <AlertTriangle :size="18" />
          </span>
          <span class="btn-text">确认执行</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .trap-display-overlay {
    background: rgba(0, 0, 0, 0.85);
  }

  .trap-display-modal {
    background: rgba(20, 10, 10, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid rgba(220, 38, 38, 0.4);
    border-radius: var(--radius-xl);
    padding: 30px;
    max-width: 500px;
    width: 90%;
    text-align: center;
    box-shadow: var(--glass-shadow-lg), var(--glow-md) rgba(220, 38, 38, 0.2);
    animation: slideIn var(--transition-normal) ease-out;
  }

  .trap-header {
    margin-bottom: 20px;
  }

  .trap-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
    color: var(--color-trap);
    animation: pulse 2s infinite;
  }

  .trap-title {
    color: var(--color-trap);
    font-size: 1.8em;
    margin: 0;
    text-shadow: var(--glow-sm) rgba(220, 38, 38, 0.5);
    font-weight: bold;
  }

  .trap-content {
    margin-bottom: 25px;
  }

  .trap-message {
    margin-bottom: 20px;
  }

  .trap-description {
    color: var(--color-special);
    font-size: 1.2em;
    font-weight: bold;
    margin: 0;
  }

  .trap-warning {
    background: rgba(220, 38, 38, 0.15);
    border: 1px solid rgba(220, 38, 38, 0.4);
    border-radius: var(--radius-md);
    padding: 15px;
  }

  .trap-warning p {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--color-trap);
    font-weight: bold;
    margin: 0;
    font-size: 0.9em;
  }

  .trap-actions {
    display: flex;
    justify-content: center;
  }

  .trap-confirm-btn {
    background: linear-gradient(135deg, #7f1d1d, var(--color-trap));
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-full);
    padding: 12px 30px;
    font-size: 1.1em;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
  }

  .trap-confirm-btn:not(:disabled):hover {
    background: linear-gradient(135deg, var(--color-trap), #ef4444);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
  }

  .trap-confirm-btn:active {
    transform: translateY(0);
  }

  @keyframes slideIn {
    from {
      transform: translateY(-50px) scale(0.9);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .trap-display-modal {
      padding: 20px;
      margin: 20px;
    }

    .trap-icon :deep(svg) {
      width: 40px;
      height: 40px;
    }

    .trap-title {
      font-size: 1.5em;
    }

    .trap-description {
      font-size: 1.1em;
    }

    .trap-confirm-btn {
      padding: 10px 25px;
      font-size: 1em;
    }
  }
</style>
