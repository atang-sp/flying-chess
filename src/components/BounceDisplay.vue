<script setup lang="ts">
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
  <div v-if="visible" class="bounce-display">
    <div class="bounce-header">
      <h3>🏐 反弹效果</h3>
      <p>超出终点，按飞行棋规则反弹！</p>
    </div>

    <div class="bounce-content">
      <div class="bounce-message">
        <p class="main-message">
          超出终点🏁(第{{ endPoint }}格)，所以倒退{{ overflowSteps }}格，最后是第{{
            finalPosition
          }}格
        </p>
      </div>

      <div class="bounce-actions">
        <button class="btn-confirm" @click="confirmBounce">✅ 确认反弹</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .bounce-display {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    z-index: 1000;
    border: 3px solid #ff9500;
    max-height: 90vh;
    overflow-y: auto;
  }

  .bounce-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .bounce-header h3 {
    font-size: 1.5rem;
    color: #ff9500;
    margin-bottom: 0.5rem;
  }

  .bounce-header p {
    color: #666;
    font-size: 1rem;
  }

  .bounce-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .bounce-message {
    background: linear-gradient(135deg, #fff4e6, #ffeaa7);
    border-radius: 12px;
    padding: 2rem;
    border: 2px solid #ff9500;
    text-align: center;
    margin: 1rem 0;
  }

  .main-message {
    margin: 0;
    color: #e17055;
    font-weight: bold;
    font-size: 1.4rem;
    line-height: 1.5;
  }

  .bounce-actions {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #ff9500, #ff7675);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
  }

  .btn-confirm:active {
    transform: translateY(0);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .bounce-display {
      padding: 1.5rem;
      width: 95%;
    }

    .bounce-message {
      padding: 1.5rem;
    }

    .main-message {
      font-size: 1.2rem;
    }
  }
</style>
