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
      <div class="bounce-explanation">
        <div class="explanation-text">
          <p>🎯 按飞行棋规则，超出终点的步数会往回反弹！</p>
        </div>
      </div>

      <div class="bounce-calculation">
        <div class="calc-header">📊 反弹计算过程：</div>
        <div class="calc-steps">
          <div class="calc-step">
            <span class="calc-label">1. 投掷移动：</span>
            <span class="calc-value">
              第{{ fromPosition }}格 + {{ targetPosition - fromPosition }}步 = 第{{
                targetPosition
              }}格
            </span>
          </div>
          <div class="calc-step highlight">
            <span class="calc-label">2. 超出终点：</span>
            <span class="calc-value">
              第{{ targetPosition }}格 - 第{{ endPoint }}格(终点) = 超出{{ overflowSteps }}步
            </span>
          </div>
          <div class="calc-step">
            <span class="calc-label">3. 反弹计算：</span>
            <span class="calc-value">
              第{{ endPoint }}格(终点) - {{ overflowSteps }}步 = 第{{ finalPosition }}格
            </span>
          </div>
        </div>
      </div>

      <div class="bounce-path">
        <div class="path-label">🛣️ 完整移动路径：</div>
        <div class="path-steps">
          <div class="path-step start-step">
            <div class="step-number">{{ fromPosition === 0 ? '起点' : `第${fromPosition}格` }}</div>
            <div class="step-label">起始位置</div>
          </div>

          <div class="path-arrow">→</div>

          <div class="path-step endpoint-step">
            <div class="step-number">第{{ endPoint }}格</div>
            <div class="step-label">终点</div>
            <div class="endpoint-indicator">🏁 胜利线</div>
          </div>

          <div class="path-arrow">→</div>

          <div class="path-step target-step">
            <div class="step-number">第{{ targetPosition }}格</div>
            <div class="step-label">目标位置</div>
            <div class="overflow-indicator">❌ 超出{{ overflowSteps }}格</div>
          </div>

          <div class="path-arrow bounce-arrow">⤵️</div>

          <div class="path-step final-step">
            <div class="step-number">第{{ finalPosition }}格</div>
            <div class="step-label">最终位置</div>
            <div class="final-indicator">✅ 反弹结果</div>
          </div>
        </div>
      </div>

      <div class="bounce-summary">
        <div class="summary-box">
          <div class="summary-title">📝 反弹规则总结</div>
          <div class="summary-content">
            <p><strong>必须恰好到达终点才能获胜！</strong></p>
            <p>超出的步数会从终点往回反弹，公式：终点位置 - 超出步数 = 最终位置</p>
          </div>
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
    font-size: 1.1rem;
  }

  .bounce-calculation {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid #dee2e6;
    margin: 1rem 0;
  }

  .calc-header {
    font-size: 1.1rem;
    font-weight: bold;
    color: #333;
    margin-bottom: 1rem;
    text-align: center;
  }

  .calc-steps {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .calc-step {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e9ecef;
    transition: all 0.3s ease;
  }

  .calc-step.highlight {
    background: linear-gradient(135deg, #fff5f5, #ffe8e8);
    border-color: #ff9500;
    box-shadow: 0 2px 4px rgba(255, 149, 0, 0.1);
  }

  .calc-label {
    font-weight: bold;
    color: #495057;
    flex-shrink: 0;
  }

  .calc-value {
    font-family: monospace;
    color: #007bff;
    font-weight: bold;
    text-align: right;
    flex-grow: 1;
    margin-left: 1rem;
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

  .endpoint-step .step-number {
    background: #fdcb6e;
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

  .endpoint-indicator {
    font-size: 0.7rem;
    color: #e17055;
    font-weight: bold;
    margin-top: 0.25rem;
    background: rgba(253, 203, 110, 0.2);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
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

  .final-indicator {
    font-size: 0.7rem;
    color: #00b894;
    font-weight: bold;
    margin-top: 0.25rem;
    background: rgba(0, 184, 148, 0.1);
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

  .bounce-summary {
    margin-top: 1rem;
  }

  .summary-box {
    background: linear-gradient(135deg, #e8f5e8, #f0fff0);
    border: 2px solid #00b894;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }

  .summary-title {
    font-size: 1.1rem;
    font-weight: bold;
    color: #00b894;
    margin-bottom: 0.75rem;
  }

  .summary-content p {
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  .summary-content p:first-child {
    color: #e17055;
    font-weight: bold;
    font-size: 1.05rem;
  }

  .summary-content p:last-child {
    color: #495057;
    font-size: 0.95rem;
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

    .bounce-calculation {
      padding: 1rem;
    }

    .calc-step {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      gap: 0.5rem;
    }

    .calc-value {
      margin-left: 0;
      text-align: left;
      font-size: 0.9rem;
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

    .summary-box {
      padding: 1rem;
    }

    .explanation-text p {
      font-size: 1rem;
    }
  }
</style>
