<script setup lang="ts">
  import { AlertTriangle, X, CircleX, Lightbulb } from '@lucide/vue'

  interface Props {
    show: boolean
    errorMessage?: string
    requiredSensitivity?: number
  }

  interface Emits {
    (e: 'close'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const closeModal = () => {
    emit('close')
  }
</script>

<template>
  <div v-if="show" class="config-error-modal">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>
          <AlertTriangle :size="22" />
          配置错误
        </h3>
        <button class="close-btn" @click="closeModal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="error-icon">
          <CircleX :size="48" />
        </div>
        <p class="error-message">{{ errorMessage }}</p>

        <div v-if="requiredSensitivity" class="suggestion">
          <h4>
            <Lightbulb :size="18" />
            建议解决方案：
          </h4>
          <ul>
            <li>添加耐受度为 {{ requiredSensitivity }} 或更高的部位</li>
            <li>或者降低工具的强度到 {{ requiredSensitivity }} 或更低</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .config-error-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-content {
    position: relative;
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(var(--glass-blur));
    border: var(--glass-border);
    border-radius: var(--radius-xl);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: var(--glass-shadow-lg);
    animation: slideIn 0.3s ease-out;
    padding: 0;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    background: rgba(239, 68, 68, 0.15);
    border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--text-primary);
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-danger);
  }

  .close-btn {
    background: var(--bg-glass);
    border: var(--glass-border);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .close-btn:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
  }

  .modal-body {
    padding: 2rem;
    text-align: center;
  }

  .error-icon {
    margin-bottom: 1rem;
    color: var(--color-danger);
    display: flex;
    justify-content: center;
  }

  .error-message {
    font-size: 1.1rem;
    color: var(--color-danger);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .suggestion {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    text-align: left;
  }

  .suggestion h4 {
    margin: 0 0 0.5rem 0;
    color: var(--color-warning);
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .suggestion ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
  }

  .suggestion li {
    margin-bottom: 0.25rem;
  }

  .modal-footer {
    padding: 1.5rem;
    text-align: center;
    border-top: var(--glass-border);
    background: var(--bg-surface);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
      max-height: 95vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-header h3 {
      font-size: 1.2rem;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .error-icon :deep(svg) {
      width: 40px;
      height: 40px;
    }

    .error-message {
      font-size: 1rem;
    }

    .modal-footer {
      padding: 1rem;
    }

    .modal-footer .btn {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
    }
  }
</style>
