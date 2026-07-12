<script setup lang="ts">
  import { Frown } from '@lucide/vue'

  interface Props {
    visible: boolean
    failedCount: number
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
  <div v-if="visible" class="relief-overlay">
    <div class="relief-modal">
      <div class="relief-header">
        <div class="relief-icon">
          <Frown :size="48" />
        </div>
        <div class="relief-title">运气太差！</div>
      </div>

      <div class="relief-content">
        <p class="relief-text">
          你已经连续 {{ failedCount }} 次掷骰都没能起飞了，开发者看不下去了，直接让你起飞到第1格！
        </p>
      </div>

      <div class="relief-footer">
        <button class="confirm-btn" @click="handleConfirm">好吧，继续游戏</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .relief-overlay {
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

  .relief-modal {
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    max-width: 480px;
    width: 90%;
    text-align: center;
    box-shadow: var(--glass-shadow-lg);
    animation: slideIn var(--transition-normal);
  }

  .relief-header {
    margin-bottom: 1.5rem;
  }

  .relief-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    color: var(--color-punishment);
  }

  .relief-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-punishment);
  }

  .relief-content {
    margin-bottom: 1.8rem;
  }

  .relief-text {
    font-size: 1.1rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .relief-footer {
    display: flex;
    justify-content: center;
  }

  .confirm-btn {
    background: linear-gradient(135deg, var(--color-accent), #764ba2);
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
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
</style>
