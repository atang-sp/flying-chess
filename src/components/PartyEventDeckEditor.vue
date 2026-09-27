<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { Copy, RotateCcw, Sparkles, Upload } from '@lucide/vue'
  import {
    DEFAULT_PARTY_EVENT_DECK,
    validatePartyEventDeck,
    type PartyEventCard,
  } from '@flying-chess/game-core/party-events'

  const { t } = useI18n()

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
      feedback.value = t('party_deck_loaded', {
        count: (parsed as readonly PartyEventCard[]).length,
      })
      feedbackKind.value = 'success'
    } catch (error) {
      feedback.value = error instanceof Error ? error.message : t('party_deck_invalid_json')
      feedbackKind.value = 'error'
    }
  }

  const copyDeck = async () => {
    refreshDraft()
    try {
      await navigator.clipboard.writeText(jsonDraft.value)
      feedback.value = t('party_deck_copied')
      feedbackKind.value = 'success'
    } catch {
      feedback.value = t('party_deck_copy_failed')
      feedbackKind.value = 'error'
    }
  }

  const resetDeck = () => {
    emit('update', DEFAULT_PARTY_EVENT_DECK)
    feedback.value = t('party_deck_reset_success')
    feedbackKind.value = 'success'
  }
</script>

<template>
  <details class="event-deck-editor">
    <summary>
      <span>
        <Sparkles :size="19" aria-hidden="true" />
        {{ t('party_deck_title') }}
      </span>
      <small>{{ t('party_deck_subtitle', { count: deck.length }) }}</small>
    </summary>

    <div class="event-deck-body">
      <p class="deck-summary">
        {{
          t('party_deck_summary', {
            rounds: triggerSummary.rounds,
            streaks: triggerSummary.streaks,
            dice: triggerSummary.dice,
          })
        }}
      </p>

      <div class="card-list" :aria-label="t('party_deck_cards_aria')">
        <article v-for="card in deck" :key="card.id">
          <strong>{{ card.title }}</strong>
          <span>{{ card.description }}</span>
          <small>{{ card.tags.join(' · ') }}</small>
        </article>
      </div>

      <label class="json-field">
        <span>{{ t('party_deck_json_label') }}</span>
        <textarea v-model="jsonDraft" rows="9" spellcheck="false"></textarea>
      </label>

      <div class="editor-actions">
        <button type="button" @click="applyDraft">
          <Upload :size="16" />
          {{ t('party_deck_btn_apply') }}
        </button>
        <button type="button" @click="copyDeck">
          <Copy :size="16" />
          {{ t('party_deck_btn_copy') }}
        </button>
        <button type="button" @click="resetDeck">
          <RotateCcw :size="16" />
          {{ t('party_deck_btn_reset') }}
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
