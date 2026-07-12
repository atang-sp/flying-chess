<script setup lang="ts">
  import { computed } from 'vue'
  import { Gift, ArrowLeft, RotateCcw, Moon, Sparkles } from '@lucide/vue'

  interface Effect {
    type: 'move' | 'skip' | 'reverse' | 'restart' | 'rest' | 'bounce' | 'chain_punishment'
    value: number
    description: string
  }

  interface Props {
    visible: boolean
    effect: Effect | null
    fromPosition?: number
    toPosition?: number
  }

  interface Emits {
    (e: 'confirm'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const showMovePath = computed(() => {
    return (
      props.effect &&
      (props.effect.type === 'move' ||
        props.effect.type === 'reverse' ||
        props.effect.type === 'restart' ||
        props.effect.type === 'rest' ||
        props.effect.type === 'bounce')
    )
  })

  const hasThirdStep = computed(() => {
    return (
      props.effect &&
      (props.effect.type === 'move' ||
        props.effect.type === 'reverse' ||
        props.effect.type === 'restart' ||
        props.effect.type === 'bounce')
    )
  })

  const getFromPositionText = (): string => {
    if (props.fromPosition === undefined || props.fromPosition === null) return '当前位置'
    return props.fromPosition === 0 ? '起点' : `第${props.fromPosition}格`
  }

  const getToPositionText = (): string => {
    if (props.toPosition === undefined || props.toPosition === null) return '目标位置'
    return props.toPosition === 0 ? '起点' : `第${props.toPosition}格`
  }

  const getFinalPositionText = (): string => {
    if (!props.effect?.description) return ''

    const description = props.effect.description
    const parts = description.split(' → ')
    if (parts.length >= 3) {
      return parts[2]
    }
    return ''
  }

  const getEffectIconComponent = () => {
    if (!props.effect) return Sparkles

    switch (props.effect.type) {
      case 'move':
        return props.effect.value > 0 ? Gift : ArrowLeft
      case 'restart':
        return RotateCcw
      case 'rest':
        return Moon
      case 'reverse':
        return ArrowLeft
      default:
        return Sparkles
    }
  }

  const getEffectTitle = (): string => {
    if (!props.effect) return '效果'

    switch (props.effect.type) {
      case 'move':
        return props.effect.value > 0 ? '前进效果' : '后退效果'
      case 'restart':
        return '回到起点'
      case 'rest':
        return '休息一回合'
      case 'reverse':
        return '后退效果'

      default:
        return '特殊效果'
    }
  }

  const handleConfirm = () => {
    emit('confirm')
  }
</script>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content effect-display-modal">
      <div class="effect-header">
        <div class="effect-icon">
          <component :is="getEffectIconComponent()" :size="48" />
        </div>
        <div class="effect-title">{{ getEffectTitle() }}</div>
      </div>

      <div class="effect-content">
        <div class="effect-description">{{ effect?.description || '' }}</div>

        <!-- 移动路径信息 -->
        <div v-if="showMovePath" class="move-path-info">
          <div class="path-label">移动路径：</div>
          <div class="path-details">
            <span class="from-position">{{ getFromPositionText() }}</span>
            <span class="path-arrow">→</span>
            <span class="to-position">{{ getToPositionText() }}</span>
            <span v-if="hasThirdStep" class="path-arrow">→</span>
            <span v-if="hasThirdStep" class="final-position">{{ getFinalPositionText() }}</span>
          </div>
        </div>

        <div v-if="effect?.type === 'move'" class="move-effect">
          <div class="effect-value">
            <span class="value-number">{{ effect.value > 0 ? '+' : '' }}{{ effect.value }}</span>
            <span class="value-unit">步</span>
          </div>
          <div class="effect-direction">
            {{ effect.value > 0 ? '前进' : '后退' }}
          </div>
        </div>

        <div v-else-if="effect?.type === 'restart'" class="restart-effect">
          <div class="effect-value">
            <span class="value-icon"><RotateCcw :size="36" /></span>
            <span class="value-text">回到起点</span>
          </div>
        </div>

        <div v-else-if="effect?.type === 'rest'" class="rest-effect">
          <div class="effect-value">
            <span class="value-icon"><Moon :size="36" /></span>
            <span class="value-text">休息一回合</span>
          </div>
        </div>
      </div>

      <div class="effect-footer">
        <button class="btn confirm-btn" @click="handleConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .effect-display-modal {
    max-width: 400px;
    text-align: center;
  }

  .effect-header {
    margin-bottom: 1.5rem;
  }

  .effect-icon {
    margin-bottom: 0.5rem;
    color: var(--color-accent-light);
  }

  .effect-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-primary);
  }

  .effect-content {
    margin-bottom: 2rem;
  }

  .effect-description {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .move-path-info {
    background: var(--bg-glass);
    backdrop-filter: blur(var(--glass-blur));
    border-radius: var(--radius-sm);
    padding: 1rem;
    margin-bottom: 1.5rem;
    border: var(--glass-border);
  }

  .path-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .path-details {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: bold;
    flex-wrap: wrap;
  }

  .from-position {
    color: var(--color-punishment);
    background: rgba(255, 71, 87, 0.15);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .path-arrow {
    color: var(--player-2);
    font-size: 1.2rem;
    font-weight: bold;
  }

  .to-position,
  .final-position {
    color: var(--color-bonus);
    background: rgba(46, 213, 115, 0.15);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .move-effect,
  .restart-effect,
  .rest-effect {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .effect-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 2rem;
    font-weight: bold;
  }

  .value-number {
    color: var(--player-2);
  }

  .value-unit {
    color: var(--text-secondary);
    font-size: 1.2rem;
  }

  .value-icon {
    display: flex;
    align-items: center;
    color: var(--color-accent-light);
  }

  .value-text {
    color: var(--color-restart);
    font-size: 1.5rem;
  }

  .effect-direction {
    font-size: 1.2rem;
    color: var(--text-secondary);
    font-weight: bold;
  }

  .effect-footer {
    display: flex;
    justify-content: center;
  }

  .confirm-btn {
    background: linear-gradient(135deg, var(--color-accent) 0%, #764ba2 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .confirm-btn:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .effect-display-modal {
      padding: 1.5rem;
    }

    .effect-icon {
      font-size: 2.5rem;
    }

    .effect-title {
      font-size: 1.3rem;
    }

    .effect-description {
      font-size: 1rem;
    }

    .path-details {
      font-size: 1rem;
    }

    .effect-value {
      font-size: 1.8rem;
    }

    .confirm-btn {
      padding: 0.6rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>
