<script setup lang="ts">
  import { Zap, Check, SkipForward, HandHeart } from '@lucide/vue'
  import type { PunishmentAction, Player } from '../types/game'

  interface Props {
    punishment: PunishmentAction | null
    executorPlayer?: Player | null
    canRequestMercy?: boolean
  }

  interface Emits {
    (e: 'confirm'): void
    (e: 'skip'): void
    (e: 'request-mercy'): void
  }

  withDefaults(defineProps<Props>(), {
    canRequestMercy: false,
  })
  const emit = defineEmits<Emits>()

  const confirmPunishment = () => {
    emit('confirm')
  }

  const skipPunishment = () => {
    emit('skip')
  }

  const requestMercy = () => {
    emit('request-mercy')
  }
</script>

<template>
  <div v-if="punishment" class="modal-overlay">
    <div class="modal-content punishment-display">
      <div class="punishment-header">
        <h3>
          <Zap :size="20" />
          惩罚时间
        </h3>
        <p>你踩到了惩罚格子！</p>
      </div>

      <div class="punishment-content">
        <!-- 执行惩罚的玩家信息 -->
        <div v-if="executorPlayer" class="executor-info">
          <div class="executor-header">
            <span class="executor-label">执行惩罚的玩家:</span>
          </div>
          <div class="executor-player">
            <div class="executor-avatar" :style="{ backgroundColor: executorPlayer.color }"></div>
            <span class="executor-name">{{ executorPlayer.name }}</span>
          </div>
        </div>

        <div class="punishment-details">
          <div class="punishment-item">
            <span class="label">工具:</span>
            <span class="value tool">{{ punishment.tool.name }}</span>
            <span class="intensity">强度: {{ punishment.tool.intensity }}/10</span>
          </div>

          <div class="punishment-item">
            <span class="label">部位:</span>
            <span class="value body-part">{{ punishment.bodyPart.name }}</span>
            <span class="sensitivity">耐受度: {{ punishment.bodyPart.sensitivity }}/10</span>
          </div>

          <div class="punishment-item">
            <span class="label">姿势:</span>
            <span class="value position">{{ punishment.position.name }}</span>
          </div>
        </div>

        <div class="punishment-summary">
          <h4>执行内容:</h4>
          <p class="summary-text">{{ punishment.description }}</p>
        </div>

        <div class="punishment-actions">
          <button class="btn btn-success" @click="confirmPunishment">
            <Check :size="18" />
            确认执行
          </button>
          <button v-if="canRequestMercy" class="btn btn-mercy" @click="requestMercy">
            <HandHeart :size="18" />
            求饶
          </button>
          <button class="btn btn-secondary" @click="skipPunishment">
            <SkipForward :size="18" />
            跳过惩罚
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .punishment-display {
    border: 1px solid rgba(255, 71, 87, 0.3);
    max-width: 500px;
  }

  .punishment-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .punishment-header h3 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem 0;
    color: var(--color-punishment);
    font-size: 1.5rem;
  }

  .punishment-header p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.1rem;
  }

  .punishment-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .executor-info {
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border-radius: var(--radius-sm);
    padding: 1rem;
    border: 1px solid var(--player-2);
  }

  .executor-header {
    margin-bottom: 0.5rem;
  }

  .executor-label {
    font-weight: bold;
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .executor-player {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .executor-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: var(--glass-shadow);
  }

  .executor-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: var(--text-primary);
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
    background: var(--bg-glass);
    border-radius: var(--radius-sm);
    border-left: 4px solid var(--color-punishment);
  }

  .label {
    font-weight: bold;
    color: var(--text-secondary);
    min-width: 60px;
  }

  .value {
    font-weight: bold;
    font-size: 1.1rem;
    flex: 1;
    color: var(--text-primary);
  }

  .tool {
    color: var(--color-punishment);
  }

  .body-part {
    color: var(--color-restart);
  }

  .position {
    color: var(--color-special);
  }

  .intensity,
  .sensitivity {
    font-size: 0.8rem;
    color: var(--text-muted);
    background: var(--bg-glass-hover);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .punishment-summary {
    text-align: center;
    padding: 1rem;
    background: linear-gradient(135deg, #c0392b, #922b21);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    box-shadow: var(--glow-sm) rgba(255, 71, 87, 0.3);
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
    flex-wrap: wrap;
  }

  .btn-mercy {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    border: none;
  }

  .btn-mercy:hover {
    filter: brightness(1.1);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .punishment-display {
      padding: 1rem;
      width: 95%;
      max-height: 95vh;
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
    .sensitivity {
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

    .punishment-actions .btn {
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
    .sensitivity {
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

    .punishment-actions .btn {
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

    .punishment-actions .btn {
      padding: 0.8rem 0.8rem;
      font-size: 0.95rem;
      min-height: 44px;
    }
  }
</style>
