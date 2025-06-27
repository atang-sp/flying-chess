<script setup lang="ts">
  import type { PunishmentAction } from '../types/game'

  interface Props {
    punishment: PunishmentAction | null
  }

  interface Emits {
    (e: 'confirm'): void
    (e: 'skip'): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()

  const confirmPunishment = () => {
    emit('confirm')
  }

  const skipPunishment = () => {
    emit('skip')
  }
</script>

<template>
  <div v-if="punishment" class="punishment-display">
    <div class="punishment-header">
      <h3>⚡ 惩罚时间</h3>
      <p>你踩到了惩罚格子！</p>
    </div>

    <div class="punishment-content">
      <div class="punishment-details">
        <div class="punishment-item">
          <span class="label">工具:</span>
          <span class="value tool">{{ punishment.tool.name }}</span>
          <span class="intensity">强度: {{ punishment.tool.intensity }}/5</span>
        </div>

        <div class="punishment-item">
          <span class="label">部位:</span>
          <span class="value body-part">{{ punishment.bodyPart.name }}</span>
          <span class="sensitivity">耐受度: {{ punishment.bodyPart.sensitivity }}/5</span>
        </div>

        <div class="punishment-item">
          <span class="label">姿势:</span>
          <span class="value position">{{ punishment.position.name }}</span>
          <span class="difficulty">难度: {{ punishment.position.difficulty }}/5</span>
        </div>
      </div>

      <div class="punishment-summary">
        <h4>执行内容:</h4>
        <p class="summary-text">{{ punishment.description }}</p>
      </div>

      <div class="punishment-actions">
        <button class="btn-confirm" @click="confirmPunishment">✅ 确认执行</button>
        <button class="btn-skip" @click="skipPunishment">⏭️ 跳过惩罚</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .punishment-display {
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
    border: 3px solid #ff6b6b;
    max-height: 90vh;
    overflow-y: auto;
  }

  .punishment-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .punishment-header h3 {
    margin: 0 0 0.5rem 0;
    color: #ff6b6b;
    font-size: 1.5rem;
  }

  .punishment-header p {
    margin: 0;
    color: #666;
    font-size: 1.1rem;
  }

  .punishment-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .punishment-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .punishment-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #ff6b6b;
  }

  .label {
    font-weight: bold;
    color: #333;
    min-width: 60px;
  }

  .value {
    font-weight: bold;
    font-size: 1.1rem;
    flex: 1;
  }

  .tool {
    color: #e74c3c;
  }

  .body-part {
    color: #9b59b6;
  }

  .position {
    color: #f39c12;
  }

  .strikes {
    color: #e67e22;
  }

  .intensity,
  .sensitivity,
  .difficulty {
    font-size: 0.8rem;
    color: #666;
    background: #e0e0e0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .punishment-summary {
    text-align: center;
    padding: 1rem;
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    border-radius: 8px;
    color: white;
  }

  .punishment-summary h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
  }

  .summary-text {
    margin: 0;
    font-size: 1.1rem;
    font-weight: bold;
  }

  .punishment-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  .btn-confirm,
  .btn-skip {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #2ed573, #1e90ff);
    color: white;
  }

  .btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(46, 213, 115, 0.3);
  }

  .btn-skip {
    background: linear-gradient(135deg, #ffa726, #ff9800);
    color: white;
  }

  .btn-skip:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 167, 38, 0.3);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .punishment-display {
      padding: 1rem;
      width: 95%;
      max-height: 95vh;
      margin: 1rem;
    }

    .punishment-header h3 {
      font-size: 1.3rem;
    }

    .punishment-header p {
      font-size: 1rem;
    }

    .punishment-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    .label {
      min-width: auto;
      font-size: 0.9rem;
    }

    .value {
      font-size: 1rem;
    }

    .intensity,
    .sensitivity,
    .difficulty {
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
    }

    .punishment-summary {
      padding: 0.75rem;
    }

    .punishment-summary h4 {
      font-size: 1.1rem;
    }

    .summary-text {
      font-size: 1rem;
    }

    .punishment-actions {
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn-confirm,
    .btn-skip {
      width: 100%;
      justify-content: center;
      padding: 1rem 1.5rem;
      font-size: 1.1rem;
      min-height: 50px;
    }
  }

  /* 小屏幕手机适配 */
  @media (max-width: 480px) {
    .punishment-display {
      padding: 0.75rem;
      width: 98%;
      max-height: 98vh;
    }

    .punishment-header {
      margin-bottom: 1.5rem;
    }

    .punishment-header h3 {
      font-size: 1.2rem;
    }

    .punishment-header p {
      font-size: 0.9rem;
    }

    .punishment-content {
      gap: 1rem;
    }

    .punishment-item {
      padding: 0.5rem;
      gap: 0.25rem;
    }

    .label {
      font-size: 0.85rem;
    }

    .value {
      font-size: 0.95rem;
    }

    .intensity,
    .sensitivity,
    .difficulty {
      font-size: 0.65rem;
      padding: 0.15rem 0.3rem;
    }

    .punishment-summary {
      padding: 0.5rem;
    }

    .punishment-summary h4 {
      font-size: 1rem;
    }

    .summary-text {
      font-size: 0.9rem;
    }

    .punishment-actions {
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .btn-confirm,
    .btn-skip {
      padding: 0.9rem 1rem;
      font-size: 1rem;
      min-height: 48px;
    }
  }

  /* 超小屏幕适配 */
  @media (max-width: 360px) {
    .punishment-display {
      padding: 0.5rem;
    }

    .punishment-header h3 {
      font-size: 1.1rem;
    }

    .punishment-header p {
      font-size: 0.85rem;
    }

    .punishment-item {
      padding: 0.4rem;
    }

    .label {
      font-size: 0.8rem;
    }

    .value {
      font-size: 0.9rem;
    }

    .btn-confirm,
    .btn-skip {
      padding: 0.8rem 0.8rem;
      font-size: 0.95rem;
      min-height: 44px;
    }
  }
</style>
