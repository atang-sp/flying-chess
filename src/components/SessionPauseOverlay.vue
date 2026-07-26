<script setup lang="ts">
  import { LogOut, Play, Shield } from '@lucide/vue'

  interface Props {
    visible: boolean
  }

  interface Emits {
    (event: 'resume'): void
    (event: 'end-session'): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()

  const resumeSession = () => emit('resume')
  const endSession = () => emit('end-session')
</script>

<template>
  <div
    v-if="visible"
    class="session-pause-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-pause-title"
  >
    <div class="session-pause-card">
      <Shield :size="48" aria-hidden="true" />
      <h2 id="session-pause-title">本局已暂停</h2>
      <p>当前回合和弹窗状态均已保留，可以随时继续。</p>

      <div class="session-pause-actions">
        <button class="resume-button" @click="resumeSession">
          <Play :size="18" aria-hidden="true" />
          继续游戏
        </button>
        <button class="end-button" @click="endSession">
          <LogOut :size="18" aria-hidden="true" />
          结束本局
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .session-pause-overlay {
    position: fixed;
    z-index: 20000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(5, 8, 20, 0.9);
    backdrop-filter: blur(12px);
  }

  .session-pause-card {
    width: min(92vw, 440px);
    padding: 2rem;
    color: var(--text-primary);
    text-align: center;
    background: rgba(20, 24, 45, 0.98);
    border: 1px solid rgba(96, 165, 250, 0.45);
    border-radius: var(--radius-xl);
    box-shadow: var(--glass-shadow-lg);
  }

  .session-pause-card > svg {
    color: #60a5fa;
  }

  .session-pause-card h2 {
    margin: 1rem 0 0.5rem;
  }

  .session-pause-card p {
    margin: 0 0 1.5rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .session-pause-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  .session-pause-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.75rem 1.25rem;
    color: white;
    border: 0;
    border-radius: var(--radius-sm);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .resume-button {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
  }

  .end-button {
    background: rgba(255, 255, 255, 0.12);
  }

  .session-pause-actions button:focus-visible {
    outline: 3px solid #93c5fd;
    outline-offset: 3px;
  }
</style>
