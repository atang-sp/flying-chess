<script setup lang="ts">
  import { HandHeart, Check, X } from '@lucide/vue'
  import { useI18n } from 'vue-i18n'
  import type { PunishmentAction, Player } from '@flying-chess/game-core/types'
  import {
    localizeToolName,
    localizeBodyPartName,
    localizePositionName,
  } from '../utils/punishmentLocalization'

  interface Props {
    visible: boolean
    punishment: PunishmentAction | null
    executorPlayer: Player | null
    targetPlayer: Player | null
    halvedStrikes: number
  }

  interface Emits {
    (e: 'mercy-result', accepted: boolean): void
  }

  defineProps<Props>()
  const emit = defineEmits<Emits>()
  const { locale } = useI18n()

  const accept = () => emit('mercy-result', true)
  const reject = () => emit('mercy-result', false)
</script>

<template>
  <div v-if="visible && punishment" class="modal-overlay mercy-overlay">
    <div class="modal-content mercy-decision">
      <div class="mercy-header">
        <HandHeart :size="28" />
        <h3>{{ $t('mercy_decision_title') }}</h3>
      </div>

      <div class="mercy-body">
        <p class="mercy-intro">
          <span class="highlight">
            {{ targetPlayer?.name ?? $t('mercy_decision_target_fallback') }}
          </span>
          {{ $t('mercy_decision_intro') }}
          <span class="highlight">
            {{ executorPlayer?.name ?? $t('mercy_decision_executor_fallback') }}
          </span>
          {{ $t('mercy_decision_plea') }}
        </p>

        <div class="mercy-comparison">
          <div class="comparison-item original">
            <span class="comparison-label">{{ $t('mercy_decision_original') }}</span>
            <span class="comparison-value">
              {{ $t('mercy_decision_strikes', { count: punishment.strikes ?? 0 }) }}
            </span>
          </div>
          <div class="comparison-arrow">→</div>
          <div class="comparison-item halved">
            <span class="comparison-label">{{ $t('mercy_decision_halved') }}</span>
            <span class="comparison-value">
              {{ $t('mercy_decision_strikes', { count: halvedStrikes }) }}
            </span>
          </div>
        </div>

        <p class="mercy-cost">
          {{ $t('mercy_decision_cost') }}
          <strong>{{ targetPlayer?.name ?? $t('mercy_decision_target_fallback') }}</strong>
          {{ $t('mercy_decision_cost_suffix') }}
        </p>

        <div class="punishment-brief">
          {{ localizeToolName(punishment.tool.name, locale) }} ·
          {{ localizeBodyPartName(punishment.bodyPart.name, locale) }} ·
          {{ localizePositionName(punishment.position.name, locale) }}
        </div>
      </div>

      <div class="mercy-actions">
        <button class="btn btn-success" @click="accept">
          <Check :size="18" />
          {{ $t('mercy_decision_accept') }}
        </button>
        <button class="btn btn-danger" @click="reject">
          <X :size="18" />
          {{ $t('mercy_decision_reject') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .mercy-overlay {
    z-index: 2100;
  }

  .mercy-decision {
    border: 1px solid rgba(245, 158, 11, 0.4);
    max-width: 420px;
  }

  .mercy-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    color: var(--color-warning, #f59e0b);
  }

  .mercy-header h3 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--color-warning, #f59e0b);
  }

  .mercy-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .mercy-intro {
    text-align: center;
    margin: 0;
    color: var(--text-secondary);
    font-size: 1.05rem;
  }

  .highlight {
    font-weight: bold;
    color: var(--text-primary);
  }

  .mercy-comparison {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .comparison-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-sm);
    background: var(--bg-glass);
  }

  .comparison-item.original .comparison-value {
    color: var(--color-punishment);
    text-decoration: line-through;
    opacity: 0.8;
  }

  .comparison-item.halved {
    border: 1px solid rgba(46, 204, 113, 0.4);
  }

  .comparison-item.halved .comparison-value {
    color: #2ecc71;
    font-weight: bold;
  }

  .comparison-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .comparison-value {
    font-size: 1.3rem;
    font-weight: bold;
  }

  .comparison-arrow {
    font-size: 1.5rem;
    color: var(--text-muted);
  }

  .mercy-cost {
    margin: 0;
    text-align: center;
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.5;
    padding: 0.75rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius-sm);
  }

  .punishment-brief {
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .mercy-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .mercy-actions {
      flex-direction: column;
    }

    .mercy-actions .btn {
      width: 100%;
      justify-content: center;
      min-height: 48px;
    }
  }
</style>
