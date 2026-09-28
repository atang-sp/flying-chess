<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { PlayerView, RequiredAction } from '../../types/network'

  const props = defineProps<{
    view: PlayerView
  }>()

  const emit = defineEmits<{
    action: [payload: { type: string; [key: string]: unknown }]
  }>()

  const pending = computed<RequiredAction | null>(() => props.view.pendingAction)
  const transferTargetIndex = ref<number>()

  watch(
    pending,
    action => {
      transferTargetIndex.value =
        action?.type === 'punishment_intervention'
          ? action.transferTargets[0]?.playerIndex
          : undefined
    },
    { immediate: true }
  )

  function send(payload: { type: string; [key: string]: unknown }): void {
    if (navigator.vibrate) navigator.vibrate(30)
    emit('action', payload)
  }
</script>

<template>
  <div v-if="pending" class="action-panel">
    <!-- Prediction: low / high -->
    <div v-if="pending.type === 'predict'" class="action-group">
      <p class="action-prompt">{{ $t('ctrl_action_guess_prompt') }}</p>
      <div class="action-buttons">
        <button
          class="btn btn-secondary action-btn"
          @click="send({ type: 'predict', prediction: 'low' })"
        >
          {{ $t('ctrl_action_guess_small') }}
        </button>
        <button
          class="btn btn-secondary action-btn"
          @click="send({ type: 'predict', prediction: 'high' })"
        >
          {{ $t('ctrl_action_guess_big') }}
        </button>
      </div>
    </div>

    <!-- Reaction decision: keep / mirror -->
    <div v-else-if="pending.type === 'reaction_decision'" class="action-group">
      <p class="action-prompt">
        {{ $t('ctrl_action_guess_success', { val: pending.rolledValue }) }}
      </p>
      <div class="action-buttons">
        <button
          class="btn btn-secondary action-btn"
          @click="send({ type: 'reaction_decision', decision: 'keep' })"
        >
          {{ $t('ctrl_action_keep', { val: pending.rolledValue }) }}
        </button>
        <button
          class="btn btn-primary action-btn"
          @click="send({ type: 'reaction_decision', decision: 'mirror' })"
        >
          {{ $t('ctrl_mirror_action', { val: 7 - (pending.rolledValue ?? 0) }) }}
        </button>
      </div>
    </div>

    <!-- Dice decision: continue / reroll -->
    <div v-else-if="pending.type === 'dice_decision'" class="action-group">
      <p class="action-prompt">
        {{ $t('ctrl_dice_result') }}
        <strong>{{ pending.diceValue }}</strong>
      </p>
      <div class="action-buttons">
        <button class="btn btn-primary action-btn" @click="send({ type: 'continue_move' })">
          {{ $t('ctrl_continue_move') }}
        </button>
        <button
          v-if="pending.canReroll"
          class="btn btn-secondary action-btn"
          @click="send({ type: 'reroll' })"
        >
          {{ $t('ctrl_reroll') }}
        </button>
      </div>
    </div>

    <!-- Punishment choice -->
    <div v-else-if="pending.type === 'punishment_choice'" class="action-group">
      <p class="action-prompt">{{ $t('ctrl_choice_prompt') }}</p>
      <div class="action-buttons vertical">
        <button
          class="btn btn-secondary action-btn"
          @click="send({ type: 'select_punishment', index: 0 })"
        >
          {{ pending.choiceA }}
        </button>
        <button
          class="btn btn-secondary action-btn"
          @click="send({ type: 'select_punishment', index: 1 })"
        >
          {{ pending.choiceB }}
        </button>
        <button class="btn-ghost" @click="send({ type: 'skip_punishment_choice' })">
          {{ $t('ctrl_skip_no_token') }}
        </button>
      </div>
    </div>

    <!-- Punishment intervention -->
    <div v-else-if="pending.type === 'punishment_intervention'" class="action-group">
      <p class="action-prompt">
        {{ $t('ctrl_interv_prompt', { name: pending.targetName, count: pending.countLabel }) }}
      </p>
      <div class="action-buttons vertical">
        <template v-if="pending.actions.includes('transfer')">
          <select
            v-model.number="transferTargetIndex"
            :aria-label="$t('ctrl_transfer_target_aria')"
            class="action-select"
          >
            <option
              v-for="target in pending.transferTargets"
              :key="target.playerIndex"
              :value="target.playerIndex"
            >
              {{ $t('ctrl_transfer_to', { name: target.playerName }) }}
            </option>
          </select>
          <button
            class="btn btn-secondary action-btn"
            :disabled="transferTargetIndex === undefined"
            @click="
              send({
                type: 'punishment_intervention',
                action: 'transfer',
                targetPlayerIndex: transferTargetIndex,
              })
            "
          >
            {{ $t('ctrl_action_transfer') }}
          </button>
        </template>
        <button
          v-if="pending.actions.includes('immunity')"
          class="btn btn-primary action-btn"
          @click="send({ type: 'punishment_intervention', action: 'immunity' })"
        >
          {{ $t('ctrl_action_immunity') }}
        </button>
        <button
          v-if="pending.actions.includes('amplify')"
          class="btn btn-primary action-btn"
          @click="send({ type: 'punishment_intervention', action: 'amplify' })"
        >
          {{ $t('ctrl_action_amplify') }}
        </button>
        <button class="btn-ghost" @click="send({ type: 'decline_punishment_intervention' })">
          {{ $t('ctrl_decline_token') }}
        </button>
      </div>
    </div>

    <!-- Acknowledge -->
    <div v-else-if="pending.type === 'acknowledge'" class="action-group">
      <p class="action-prompt">{{ pending.message }}</p>
      <button class="btn btn-primary action-btn" @click="send({ type: 'acknowledge' })">
        {{ $t('ctrl_confirm') }}
      </button>
    </div>

    <!-- Tiebreak roll -->
    <div v-else-if="pending.type === 'tiebreak_roll'" class="action-group">
      <p class="action-prompt">{{ $t('ctrl_tiebreak_prompt') }}</p>
      <button class="btn btn-primary action-btn dice-btn" @click="send({ type: 'tiebreak_roll' })">
        {{ $t('ctrl_roll_dice') }}
      </button>
    </div>

    <!-- Roll dice (explicit action required) -->
    <div v-else-if="pending.type === 'roll_dice'" class="action-group">
      <button class="btn btn-primary action-btn dice-btn" @click="send({ type: 'roll_dice' })">
        {{ $t('ctrl_roll_dice') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
  .action-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 0;
    flex: 1;
  }

  .action-group {
    width: 100%;
    text-align: center;
  }

  .action-prompt {
    font-weight: 600;
    margin-bottom: 0.75rem;
    font-size: 1rem;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .action-buttons.vertical {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    min-width: 120px;
  }

  .action-buttons.vertical .action-btn {
    width: 100%;
    max-width: 300px;
  }

  .dice-btn {
    width: 100%;
    max-width: 280px;
    padding: 1.25rem 2rem;
    font-size: 1.25rem;
  }

  .btn-ghost {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--color-text-muted, #8a8780);
    padding: 0.5rem 1rem;
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
    width: 100%;
    max-width: 300px;
  }

  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .action-select {
    width: 100%;
    max-width: 300px;
    min-height: 44px;
    padding: 0.6rem;
    color: var(--color-text, #e8e6e3);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: var(--radius-md, 8px);
  }
</style>
