<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { CopyX } from '@lucide/vue'

  interface Props {
    visible: boolean
  }

  interface Emits {
    (e: 'confirm'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const showContent = ref(false)

  watch(
    () => props.visible,
    newVal => {
      if (newVal) {
        showContent.value = false
        setTimeout(() => {
          showContent.value = true
        }, 300)
      }
    }
  )

  const confirm = () => {
    emit('confirm')
  }
</script>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content double-reveal">
      <div class="double-reveal-animation" :class="{ visible: showContent }">
        <div class="double-icon">
          <CopyX :size="48" />
        </div>
        <h2 class="double-title">翻倍！</h2>
        <p class="double-description">相同惩罚再来一次！</p>
      </div>

      <div v-if="showContent" class="double-actions">
        <button class="btn btn-danger" @click="confirm">接受命运</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .double-reveal {
    border: 2px solid rgba(255, 71, 87, 0.6);
    max-width: 400px;
    text-align: center;
  }

  .double-reveal-animation {
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity 0.4s ease-out,
      transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .double-reveal-animation.visible {
    opacity: 1;
    transform: scale(1);
  }

  .double-icon {
    color: var(--color-punishment);
    margin-bottom: 1rem;
    animation: pulse-icon 1s ease-in-out infinite;
  }

  @keyframes pulse-icon {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
  }

  .double-title {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--color-punishment);
    margin: 0 0 0.5rem 0;
    text-shadow: 0 0 20px rgba(255, 71, 87, 0.5);
  }

  .double-description {
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .double-actions {
    margin-top: 2rem;
  }

  .double-actions .btn {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.2rem;
    font-weight: bold;
    min-height: 50px;
  }

  .btn-danger {
    background: linear-gradient(135deg, #c0392b, #922b21);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .btn-danger:hover {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4);
  }

  @media (max-width: 768px) {
    .double-reveal {
      width: 90%;
      padding: 1.5rem;
    }

    .double-title {
      font-size: 2rem;
    }

    .double-description {
      font-size: 1rem;
    }
  }
</style>
