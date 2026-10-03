<script setup lang="ts">
  import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { X } from '@lucide/vue'
  import ProgressAchievements from './ProgressAchievements.vue'
  import type { LocalProgress } from '../services/localProgress'

  const props = defineProps<{ open: boolean; progress: LocalProgress }>()
  const emit = defineEmits<{ close: [] }>()
  const dialog = ref<HTMLDialogElement | null>(null)
  watch(
    () => props.open,
    async open => {
      // Unmount nested posters before closing the parent and returning focus home.
      await nextTick()
      if (open && props.open && !dialog.value?.open) dialog.value?.showModal()
      else if (!props.open) dialog.value?.close()
    }
  )
  onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog
    ref="dialog"
    class="achievements-dialog"
    aria-labelledby="achievements-dialog-title"
    data-testid="achievements-dialog"
    @cancel.prevent="emit('close')"
  >
    <header>
      <h2 id="achievements-dialog-title">{{ $t('my_achievements') }}</h2>
      <button type="button" autofocus :aria-label="$t('achievements_close')" @click="emit('close')">
        <X :size="22" />
      </button>
    </header>
    <ProgressAchievements v-if="open" :progress="progress" />
  </dialog>
</template>

<style scoped>
  .achievements-dialog {
    width: min(760px, calc(100% - 1.5rem));
    max-height: calc(100dvh - 1.5rem);
    overflow-y: auto;
    box-sizing: border-box;
    padding: 1rem;
    border: 1px solid #cbaa63;
    border-radius: 20px;
    color: #f9edcf;
    background: #152b23;
  }
  .achievements-dialog::backdrop {
    background: #06120de6;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    min-width: 44px;
    min-height: 44px;
    border: 1px solid #cbaa6380;
    border-radius: 10px;
    color: inherit;
    background: #2a4437;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid #f9edcf;
    outline-offset: 3px;
  }
</style>
