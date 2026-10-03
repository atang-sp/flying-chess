<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Download, Share2, X } from '@lucide/vue'
  import { canSharePoster, createSharePoster } from '../services/sharePoster'

  const props = defineProps<{ open: boolean; title: string; lines: readonly string[] }>()
  const emit = defineEmits<{ close: [] }>()
  const { t } = useI18n()
  const dialog = ref<HTMLDialogElement | null>(null)
  const nickname = ref('')
  const includeNickname = ref(false)
  const previewUrl = ref('')
  const posterFile = ref<File | null>(null)
  const busy = ref(false)
  const sharing = ref(false)
  const error = ref('')
  const shareAvailable = computed(() => posterFile.value && canSharePoster(posterFile.value))
  let revision = 0

  function clearPreview() {
    previewUrl.value = ''
    posterFile.value = null
  }

  async function renderPoster() {
    const current = ++revision
    clearPreview()
    error.value = ''
    if (!props.open) return
    busy.value = true
    try {
      const blob = await createSharePoster({
        brand: t('poster_brand'),
        title: props.title,
        lines: props.lines,
        invitation: t('poster_invitation'),
        nickname: includeNickname.value ? nickname.value : undefined,
      })
      // WebKit's offline mode can block blob URL image loads. Inline the PNG
      // for preview/download; the prepared File still powers native sharing.
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      if (current !== revision) return
      posterFile.value = new File([blob], 'flying-chess-highlight.png', { type: 'image/png' })
      previewUrl.value = url
    } catch {
      if (current === revision) error.value = t('poster_failed')
    } finally {
      if (current === revision) busy.value = false
    }
  }

  watch(
    () => props.open,
    async open => {
      if (open) {
        nickname.value = ''
        includeNickname.value = false
        await nextTick()
        if (props.open && !dialog.value?.open) dialog.value?.showModal()
      } else {
        revision++
        dialog.value?.close()
        clearPreview()
      }
    }
  )
  watch(
    () =>
      JSON.stringify({
        open: props.open,
        title: props.title,
        lines: props.lines,
        includeNickname: includeNickname.value,
        nickname: nickname.value,
        brand: t('poster_brand'),
        invitation: t('poster_invitation'),
      }),
    () => void renderPoster()
  )

  function savePoster() {
    if (!posterFile.value || !previewUrl.value) return
    const link = document.createElement('a')
    link.href = previewUrl.value
    link.download = posterFile.value.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async function sharePoster() {
    if (!posterFile.value || !shareAvailable.value || sharing.value) return
    error.value = ''
    sharing.value = true
    try {
      // The PNG is ready before the click, preserving native user activation.
      await navigator.share({ files: [posterFile.value] })
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        error.value = t('poster_share_failed')
      }
    } finally {
      sharing.value = false
    }
  }
  onBeforeUnmount(() => {
    revision++
    clearPreview()
  })
</script>

<template>
  <dialog
    ref="dialog"
    class="poster-dialog"
    aria-labelledby="poster-dialog-title"
    data-testid="poster-dialog"
    @cancel.prevent="emit('close')"
  >
    <header>
      <h2 id="poster-dialog-title">{{ $t('poster_preview') }}</h2>
      <button type="button" :aria-label="$t('poster_close')" @click="emit('close')">
        <X :size="22" />
      </button>
    </header>
    <p>{{ $t('poster_privacy') }}</p>
    <label class="nickname-toggle">
      <input v-model="includeNickname" type="checkbox" />
      {{ $t('poster_include_nickname') }}
    </label>
    <input
      v-if="includeNickname"
      v-model="nickname"
      class="nickname-input"
      maxlength="40"
      :aria-label="$t('poster_nickname')"
      :placeholder="$t('poster_nickname')"
    />
    <p v-if="busy" role="status">{{ $t('poster_generating') }}</p>
    <img
      v-if="previewUrl"
      :src="previewUrl"
      :alt="$t('poster_preview')"
      data-testid="poster-image"
    />
    <p v-if="error" role="alert">{{ error }}</p>
    <footer>
      <button type="button" :disabled="!posterFile || busy" @click="savePoster">
        <Download :size="18" />
        {{ $t('poster_save') }}
      </button>
      <button v-if="shareAvailable" type="button" :disabled="busy || sharing" @click="sharePoster">
        <Share2 :size="18" />
        {{ $t('poster_share') }}
      </button>
      <button v-if="error && !posterFile" type="button" @click="renderPoster">
        {{ $t('poster_retry') }}
      </button>
    </footer>
  </dialog>
</template>

<style scoped>
  .poster-dialog {
    width: min(480px, calc(100% - 2rem));
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    box-sizing: border-box;
    padding: 1.2rem;
    border: 1px solid #cbaa63;
    border-radius: 20px;
    color: #f9edcf;
    background: #152b23;
  }
  .poster-dialog::backdrop {
    background: #06120de6;
  }
  header,
  footer,
  button,
  .nickname-toggle {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  header {
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  p {
    color: #cfdbd1;
    font-size: 0.85rem;
  }
  img {
    display: block;
    width: 100%;
    margin-top: 1rem;
    border-radius: 10px;
  }
  footer {
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  button {
    min-height: 44px;
    padding: 0.5rem 0.8rem;
    border: 1px solid #cbaa6380;
    border-radius: 10px;
    color: inherit;
    background: #2a4437;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .nickname-input {
    width: 100%;
    box-sizing: border-box;
    margin-top: 0.6rem;
    padding: 0.7rem;
    font-size: 16px;
  }
  :focus-visible {
    outline: 2px solid #f9edcf;
    outline-offset: 3px;
  }
</style>
