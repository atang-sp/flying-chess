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

  const closeModal = () => {
    emit('close')
  }
</script>

<template>
  <div v-if="show" class="config-error-modal">
    <div class="modal-overlay" @click="closeModal"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>⚠️ 配置错误</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <div class="error-icon">❌</div>
        <p class="error-message">{{ errorMessage }}</p>

        <div v-if="requiredSensitivity" class="suggestion">
          <h4>💡 建议解决方案：</h4>
          <ul>
            <li>添加耐受度为 {{ requiredSensitivity }} 或更高的部位</li>
            <li>或者降低工具的强度到 {{ requiredSensitivity }} 或更低</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-primary" @click="closeModal">我知道了</button>
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
  }

  .modal-content {
    position: relative;
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
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
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .modal-body {
    padding: 2rem;
    text-align: center;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-message {
    font-size: 1.1rem;
    color: #333;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .suggestion {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1rem;
    text-align: left;
  }

  .suggestion h4 {
    margin: 0 0 0.5rem 0;
    color: #495057;
    font-size: 1rem;
  }

  .suggestion ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #6c757d;
  }

  .suggestion li {
    margin-bottom: 0.25rem;
  }

  .modal-footer {
    padding: 1.5rem;
    text-align: center;
    border-top: 1px solid #e9ecef;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
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

    .error-icon {
      font-size: 2.5rem;
    }

    .error-message {
      font-size: 1rem;
    }

    .modal-footer {
      padding: 1rem;
    }

    .btn-primary {
      width: 100%;
      padding: 1rem;
      font-size: 1.1rem;
    }
  }
</style>
