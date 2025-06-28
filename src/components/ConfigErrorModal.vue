<script setup lang="ts">
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

  const handleOverlayClick = () => {
    emit('close')
  }

  const handleClose = () => {
    emit('close')
  }
</script>

<template>
  <div v-if="show" class="config-error-modal">
    <div class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="error-icon">⚠️</div>
          <h3>配置验证失败</h3>
          <button class="close-btn" @click="handleClose">×</button>
        </div>

        <div class="modal-body">
          <div class="error-message">{{ errorMessage }}</div>

          <div v-if="requiredSensitivity" class="suggestion">
            <div class="suggestion-title">💡 建议解决方案：</div>
            <div class="suggestion-content">
              <p>
                请添加一个耐受度为
                <strong>{{ requiredSensitivity }}</strong>
                的部位，或者调整现有部位的耐受度。
              </p>
              <p>例如：添加一个名为"屁股"的部位，耐受度设置为 {{ requiredSensitivity }}。</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" @click="handleClose">我知道了</button>
        </div>
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
    z-index: 1000;
  }

  .modal-overlay {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: min(500px, 90vw);
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1.2rem 1.5rem 0.8rem;
    border-bottom: 1px solid #e0e0e0;
    position: relative;
  }

  .error-icon {
    font-size: 1.5rem;
  }

  .modal-header h3 {
    margin: 0;
    color: #d32f2f;
    font-size: 1.2rem;
    font-weight: 600;
    flex: 1;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: #f5f5f5;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #666;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #e0e0e0;
    color: #333;
  }

  .modal-body {
    padding: 1.2rem 1.5rem;
  }

  .error-message {
    color: #d32f2f;
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 1rem;
    padding: 0.8rem;
    background: #ffebee;
    border-radius: 6px;
    border-left: 4px solid #d32f2f;
  }

  .suggestion {
    background: #e3f2fd;
    border-radius: 6px;
    padding: 1rem;
    border-left: 4px solid #2196f3;
  }

  .suggestion-title {
    font-weight: 600;
    color: #1976d2;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
  }

  .suggestion-content {
    color: #1565c0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .suggestion-content p {
    margin: 0.3rem 0;
  }

  .suggestion-content strong {
    color: #d32f2f;
  }

  .modal-footer {
    padding: 0.8rem 1.5rem 1.2rem;
    display: flex;
    justify-content: center;
  }

  .btn-primary {
    padding: 0.6rem 1.5rem;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }

  /* 移动端优化 */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-width: 95vw;
    }

    .modal-header {
      padding: 1rem 1.2rem 0.6rem;
    }

    .modal-header h3 {
      font-size: 1.1rem;
    }

    .modal-body {
      padding: 1rem 1.2rem;
    }

    .error-message {
      font-size: 0.95rem;
      padding: 0.6rem;
    }

    .suggestion {
      padding: 0.8rem;
    }

    .suggestion-title {
      font-size: 0.9rem;
    }

    .suggestion-content {
      font-size: 0.85rem;
    }

    .modal-footer {
      padding: 0.6rem 1.2rem 1rem;
    }

    .btn-primary {
      padding: 0.5rem 1.2rem;
      font-size: 0.95rem;
    }
  }

  /* 超小屏幕优化 */
  @media (max-width: 480px) {
    .modal-header {
      padding: 0.8rem 1rem 0.5rem;
    }

    .modal-header h3 {
      font-size: 1rem;
    }

    .modal-body {
      padding: 0.8rem 1rem;
    }

    .error-message {
      font-size: 0.9rem;
      padding: 0.5rem;
    }

    .suggestion {
      padding: 0.6rem;
    }

    .suggestion-title {
      font-size: 0.85rem;
    }

    .suggestion-content {
      font-size: 0.8rem;
    }

    .modal-footer {
      padding: 0.5rem 1rem 0.8rem;
    }

    .btn-primary {
      padding: 0.4rem 1rem;
      font-size: 0.9rem;
    }
  }
</style>
