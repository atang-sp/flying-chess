<script setup lang="ts">
  interface Props {
    visible: boolean
    fromPosition: number
    targetPosition: number
    finalPosition: number
    overflowSteps: number
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
      <div class="bounce-explanation">
        <div class="explanation-text">
          <p>根据飞行棋规则，超出终点的步数会反弹回来：</p>
        </div>
      </div>

      <div class="bounce-path">
        <div class="path-label">移动路径：</div>
        <div class="path-steps">
          <div class="path-step start-step">
            <div class="step-number">{{ fromPosition === 0 ? '起点' : `第${fromPosition}格` }}</div>
            <div class="step-label">起始位置</div>
          </div>

          <div class="path-arrow">→</div>

          <div class="path-step target-step">
            <div class="step-number">第{{ targetPosition }}格</div>
            <div class="step-label">目标位置</div>
            <div class="overflow-indicator">超出{{ overflowSteps }}格</div>
          </div>

          <div class="path-arrow bounce-arrow">⤵️</div>

          <div class="path-step final-step">
            <div class="step-number">第{{ finalPosition }}格</div>
            <div class="step-label">反弹后位置</div>
          </div>
        </div>
      </div>

      <div class="bounce-details">
        <div class="detail-item">
          <span class="detail-label">超出步数:</span>
          <span class="detail-value overflow">{{ overflowSteps }}步</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">反弹规则:</span>
          <span class="detail-value rule">终点 - 超出步数</span>
        </div>
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

  .bounce-explanation {
    background: linear-gradient(135deg, #fff4e6, #ffeaa7);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #ff9500;
  }

  .explanation-text p {
    margin: 0;
    color: #e17055;
    font-weight: bold;
    text-align: center;
  }

  .bounce-path {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid #dee2e6;
  }

  .path-label {
    font-size: 1rem;
    font-weight: bold;
    color: #333;
    margin-bottom: 1rem;
    text-align: center;
  }

  .path-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .path-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-width: 80px;
  }

  .step-number {
    font-size: 1.1rem;
    font-weight: bold;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.25rem;
  }

  .step-label {
    font-size: 0.8rem;
    color: #666;
    font-weight: bold;
  }

  .start-step .step-number {
    background: #74b9ff;
    color: white;
  }

  .target-step .step-number {
    background: #fd79a8;
    color: white;
  }

  .final-step .step-number {
    background: #00b894;
    color: white;
  }

  .overflow-indicator {
    font-size: 0.7rem;
    color: #e17055;
    font-weight: bold;
    margin-top: 0.25rem;
    background: rgba(225, 112, 85, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .path-arrow {
    font-size: 1.5rem;
    color: #666;
    font-weight: bold;
  }

  .bounce-arrow {
    color: #ff9500;
    font-size: 1.8rem;
  }

  .bounce-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #f1f3f4;
    padding: 1rem;
    border-radius: 8px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .detail-label {
    font-weight: bold;
    color: #333;
  }

  .detail-value {
    font-weight: bold;
  }

  .detail-value.overflow {
    color: #e17055;
  }

  .detail-value.rule {
    color: #00b894;
    font-family: monospace;
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

    .path-steps {
      flex-direction: column;
      gap: 0.75rem;
    }

    .path-arrow {
      transform: rotate(90deg);
    }

    .bounce-arrow {
      transform: rotate(90deg);
    }

    .path-step {
      min-width: auto;
      width: 100%;
    }

    .step-number {
      padding: 0.75rem 1rem;
    }
  }
</style>
