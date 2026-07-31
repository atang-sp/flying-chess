<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { Copy, RotateCcw, Sparkles, Upload } from '@lucide/vue'
  import {
    DEFAULT_PARTY_EVENT_DECK,
    validatePartyEventDeck,
    type PartyEventCard,
  } from '../services/partyEvents'

  const props = defineProps<{ deck: readonly PartyEventCard[] }>()
  const emit = defineEmits<{ (event: 'update', deck: readonly PartyEventCard[]): void }>()

  const jsonDraft = ref('')
  const feedback = ref('')
  const feedbackKind = ref<'success' | 'error'>('success')
  const triggerSummary = computed(() => ({
    rounds: props.deck.filter(card => card.trigger.kind === 'every_n_turns').length,
    streaks: props.deck.filter(card => card.trigger.kind === 'consecutive_punishments').length,
    dice: props.deck.filter(card => card.trigger.kind === 'dice_value').length,
  }))

  const refreshDraft = () => {
    jsonDraft.value = JSON.stringify(props.deck, null, 2)
  }
  watch(() => props.deck, refreshDraft, { immediate: true })

  const applyDraft = () => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft.value)
      const validation = validatePartyEventDeck(parsed)
      if (!validation.ok) throw new Error(validation.error)
      emit('update', parsed as readonly PartyEventCard[])
      feedback.value = `已载入 ${(parsed as readonly PartyEventCard[]).length} 张事件卡`
      feedbackKind.value = 'success'
    } catch (error) {
      feedback.value = error instanceof Error ? error.message : '事件卡 JSON 无效'
      feedbackKind.value = 'error'
    }
  }

  const copyDeck = async () => {
    refreshDraft()
    try {
      await navigator.clipboard.writeText(jsonDraft.value)
      feedback.value = '卡包 JSON 已复制，可直接分享'
      feedbackKind.value = 'success'
    } catch {
      feedback.value = '浏览器未允许复制，请从下方文本框手动复制'
      feedbackKind.value = 'error'
    }
  }

  const resetDeck = () => {
    emit('update', DEFAULT_PARTY_EVENT_DECK)
    feedback.value = '已恢复内置事件卡池'
    feedbackKind.value = 'success'
  }
</script>

<template>
  <details class="event-deck-editor">
    <summary>
      <span>
        <Sparkles :size="19" aria-hidden="true" />
        事件卡 / 命运轮盘
      </span>
      <small>{{ deck.length }} 张 · 可自定义与导入</small>
    </summary>

    <div class="event-deck-body">
      <p class="deck-summary">
        每 N 回合 {{ triggerSummary.rounds }} 张 · 连续惩罚 {{ triggerSummary.streaks }} 张 ·
        特定骰点 {{ triggerSummary.dice }} 张
      </p>

      <div class="card-list" aria-label="当前事件卡">
        <article v-for="card in deck" :key="card.id">
          <strong>{{ card.title }}</strong>
          <span>{{ card.description }}</span>
          <small>{{ card.tags.join(' · ') }}</small>
        </article>
      </div>

      <label class="json-field">
        <span>卡包 JSON（触发条件与效果均可编辑）</span>
        <textarea v-model="jsonDraft" rows="9" spellcheck="false"></textarea>
      </label>

      <div class="editor-actions">
        <button type="button" @click="applyDraft">
          <Upload :size="16" />
          校验并载入
        </button>
        <button type="button" @click="copyDeck">
          <Copy :size="16" />
          复制分享
        </button>
        <button type="button" @click="resetDeck">
          <RotateCcw :size="16" />
          恢复内置
        </button>
      </div>
      <p v-if="feedback" class="feedback" :class="`feedback--${feedbackKind}`">{{ feedback }}</p>
    </div>
  </details>
</template>

<style scoped>
  .event-deck-editor {
    margin-top: 1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(168 85 247 / 0.28);
    border-radius: var(--radius-xl);
  }

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 58px;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  summary span,
  .editor-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  summary small,
  .deck-summary,
  .card-list span,
  .card-list small {
    color: var(--text-muted);
  }

  .event-deck-body {
    display: grid;
    gap: 0.9rem;
    padding: 0 1rem 1rem;
  }

  .deck-summary,
  .feedback {
    margin: 0;
  }

  .card-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 0.6rem;
  }

  .card-list article {
    display: grid;
    gap: 0.25rem;
    padding: 0.7rem;
    background: rgb(30 41 59 / 0.72);
    border-radius: 12px;
  }

  .card-list span {
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .json-field,
  .json-field > span {
    display: grid;
    gap: 0.4rem;
  }

  textarea {
    width: 100%;
    padding: 0.7rem;
    color: #e2e8f0;
    background: #0f172a;
    border: 1px solid rgb(148 163 184 / 0.3);
    border-radius: 10px;
    font:
      0.75rem/1.45 ui-monospace,
      monospace;
    resize: vertical;
  }

  .editor-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .editor-actions button {
    min-height: 42px;
    padding: 0.55rem 0.75rem;
    color: #f8fafc;
    background: rgb(88 28 135 / 0.72);
    border: 1px solid rgb(192 132 252 / 0.3);
    border-radius: 10px;
    cursor: pointer;
  }

  .feedback--success {
    color: #86efac;
  }

  .feedback--error {
    color: #fca5a5;
  }
</style>
