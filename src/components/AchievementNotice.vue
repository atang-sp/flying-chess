<script setup lang="ts">
  import { onBeforeUnmount, watch } from 'vue'
  import { Award } from '@lucide/vue'
  import type { LocalAchievement } from '../services/localProgress'

  const props = defineProps<{ achievements: readonly LocalAchievement[]; blocked: boolean }>()
  const emit = defineEmits<{ consumed: [] }>()
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(
    () => [props.blocked, props.achievements.length],
    () => {
      clearTimeout(timer)
      if (!props.blocked && props.achievements.length) {
        timer = setTimeout(() => emit('consumed'), 5000)
      }
    },
    { immediate: true }
  )
  onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <aside
    v-if="!blocked && achievements.length"
    class="achievement-notice"
    role="status"
    aria-live="polite"
    data-testid="achievement-notice"
  >
    <Award :size="24" aria-hidden="true" />
    <div>
      <strong>{{ $t('achievement_unlocked_notice') }}</strong>
      <p>{{ achievements.map(item => $t(item.title)).join(' · ') }}</p>
    </div>
  </aside>
</template>

<style scoped>
  .achievement-notice {
    position: fixed;
    z-index: 1500;
    top: max(1rem, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.75rem;
    align-items: center;
    width: min(440px, calc(100% - 2rem));
    padding: 1rem;
    border: 1px solid #cbaa63;
    border-radius: 16px;
    color: #f9edcf;
    background: #183329;
    box-shadow: 0 10px 36px #0006;
    pointer-events: none;
  }
  p {
    margin: 0.25rem 0 0;
    overflow-wrap: anywhere;
  }
</style>
