<script setup lang="ts">
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
        <div class="relief-icon">🤯</div>
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
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  .relief-modal {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    max-width: 480px;
    width: 90%;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease;
  }

  .relief-header {
    margin-bottom: 1.5rem;
  }

  .relief-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .relief-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: #ff6b6b;
  }

  .relief-content {
    margin-bottom: 1.8rem;
  }

  .relief-text {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.5;
  }

  .relief-footer {
    display: flex;
    justify-content: center;
  }

  .confirm-btn {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .confirm-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
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
