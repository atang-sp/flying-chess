<script setup lang="ts">
  import { computed, onBeforeUnmount, watch } from 'vue'
  import { ArrowLeft, Gift, Moon, RotateCcw, Sparkles, Rocket } from '@lucide/vue'

  interface Effect {
    type: string
    value: number
    description: string
  }

  interface Props {
    visible: boolean
    effect: Effect | null
    autoDismissMs?: number
  }

  interface Emits {
    (e: 'confirm'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    autoDismissMs: 1100,
  })
  const emit = defineEmits<Emits>()

  let dismissTimer: ReturnType<typeof setTimeout> | null = null

  const clearTimer = () => {
    if (dismissTimer !== null) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  const handleDismiss = () => {
    clearTimer()
    emit('confirm')
  }

  watch(
    () => props.visible,
    isVisible => {
      clearTimer()
      if (isVisible) {
        dismissTimer = setTimeout(() => {
          handleDismiss()
        }, props.autoDismissMs)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    clearTimer()
  })

  const effectDetails = computed(() => {
    if (!props.effect) {
      return {
        icon: Sparkles,
        title: '触发效果',
        className: 'toast-default',
      }
    }

    switch (props.effect.type) {
      case 'move':
        return props.effect.value > 0
          ? { icon: Rocket, title: '步数奖励', className: 'toast-bonus' }
          : { icon: ArrowLeft, title: '步数扣除', className: 'toast-reverse' }
      case 'reverse':
        return { icon: ArrowLeft, title: '后退', className: 'toast-reverse' }
      case 'restart':
        return { icon: RotateCcw, title: '重回起点', className: 'toast-restart' }
      case 'rest':
        return { icon: Moon, title: '休息一轮', className: 'toast-rest' }
      case 'bounce':
        return { icon: Sparkles, title: '终点反弹', className: 'toast-bounce' }
      default:
        return { icon: Gift, title: '获得效果', className: 'toast-default' }
    }
  })
</script>

<template>
  <Transition name="floating-toast">
    <div
      v-if="visible && effect"
      class="board-floating-toast-container"
      role="status"
      aria-live="polite"
      @click="handleDismiss"
    >
      <div class="floating-toast-card" :class="effectDetails.className">
        <div class="toast-icon-wrapper">
          <component :is="effectDetails.icon" :size="20" class="toast-icon" />
        </div>
        <div class="toast-text-content">
          <span class="toast-kicker">{{ effectDetails.title }}</span>
          <strong class="toast-message">{{ effect.description }}</strong>
        </div>
        <span class="toast-tap-hint">轻点跳过</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
  .board-floating-toast-container {
    position: absolute;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 500;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .floating-toast-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1.15rem 0.65rem 0.85rem;
    border-radius: 999px;
    border: 1px solid rgba(218, 181, 111, 0.45);
    background: linear-gradient(135deg, rgba(8, 28, 22, 0.94), rgba(4, 18, 14, 0.96));
    backdrop-filter: blur(14px);
    box-shadow:
      0 12px 32px rgba(1, 12, 9, 0.5),
      0 0 20px rgba(218, 181, 111, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    color: #fbf5e9;
    white-space: nowrap;
    transition: transform 0.2s ease;
  }

  .floating-toast-card:hover {
    transform: scale(1.03);
  }

  .toast-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(218, 181, 111, 0.18);
    color: #e5c98f;
    flex-shrink: 0;
  }

  .toast-text-content {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  .toast-kicker {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #c9a461;
    text-transform: uppercase;
  }

  .toast-message {
    font-size: 0.88rem;
    font-weight: 600;
    color: #fffaf0;
  }

  .toast-tap-hint {
    font-size: 0.65rem;
    color: rgba(230, 220, 195, 0.48);
    padding-left: 0.5rem;
    border-left: 1px solid rgba(218, 181, 111, 0.2);
  }

  /* 变体特色装饰 */
  .toast-bonus .toast-icon-wrapper {
    background: rgba(46, 213, 115, 0.2);
    color: #4ade80;
  }
  .toast-bonus {
    border-color: rgba(74, 222, 128, 0.45);
    box-shadow:
      0 12px 32px rgba(1, 12, 9, 0.5),
      0 0 20px rgba(74, 222, 128, 0.22);
  }

  .toast-reverse .toast-icon-wrapper {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  .toast-reverse {
    border-color: rgba(248, 113, 113, 0.45);
    box-shadow:
      0 12px 32px rgba(1, 12, 9, 0.5),
      0 0 20px rgba(248, 113, 113, 0.22);
  }

  .toast-rest .toast-icon-wrapper {
    background: rgba(168, 85, 247, 0.2);
    color: #c084fc;
  }

  /* 进场与退场动效 */
  .floating-toast-enter-active {
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .floating-toast-leave-active {
    transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
  }

  .floating-toast-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(-18px) scale(0.88);
  }

  .floating-toast-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-14px) scale(0.94);
  }
</style>
