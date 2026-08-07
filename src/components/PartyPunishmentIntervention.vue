<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { ArrowRightLeft, Ban, Coins, Flame, Timer } from '@lucide/vue'
  import type { Player, ResolvedPunishmentResult } from '@flying-chess/game-core/types'
  import type {
    PartyPunishmentIntervention,
    PartyPunishmentInterventionOption,
  } from '@flying-chess/game-core/party-interventions'

  const TIMEOUT_SECONDS = 10

  const props = defineProps<{
    visible: boolean
    resolution: ResolvedPunishmentResult | null
    players: readonly Player[]
    options: readonly PartyPunishmentInterventionOption[]
    tokensRemaining: readonly number[]
    paused: boolean
  }>()

  const emit = defineEmits<{
    (event: 'apply', intervention: PartyPunishmentIntervention): void
    (event: 'skip'): void
  }>()

  const secondsRemaining = ref(TIMEOUT_SECONDS)
  const transferTargets = ref<Record<number, number>>({})
  let timer: number | undefined
  let submitted = false

  const targetPlayer = computed(() =>
    props.resolution ? props.players[props.resolution.targetPlayerIndex] : undefined
  )
  const punishmentCount = computed(() => {
    const count = props.resolution?.count
    return count?.kind === 'fixed' ? `${count.value} 下` : '次数待选'
  })

  const clearTimer = () => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }

  const skip = () => {
    if (submitted) return
    submitted = true
    clearTimer()
    emit('skip')
  }

  const startTimer = (reset: boolean) => {
    clearTimer()
    submitted = false
    if (reset) secondsRemaining.value = TIMEOUT_SECONDS
    timer = window.setInterval(() => {
      secondsRemaining.value -= 1
      if (secondsRemaining.value <= 0) skip()
    }, 1000)
  }

  watch(
    () => [props.visible, props.paused] as const,
    ([visible, paused], previous) => {
      if (!visible || paused) {
        clearTimer()
        return
      }
      if (previous?.[0] !== true) {
        transferTargets.value = Object.fromEntries(
          props.options.flatMap(option => {
            const firstTarget = option.transferTargetPlayerIndices[0]
            return firstTarget === undefined ? [] : [[option.playerIndex, firstTarget]]
          })
        )
      }
      startTimer(previous?.[0] !== true)
    },
    { immediate: true }
  )
  onBeforeUnmount(clearTimer)

  const apply = (intervention: PartyPunishmentIntervention) => {
    if (submitted) return
    submitted = true
    clearTimer()
    emit('apply', intervention)
  }
</script>

<template>
  <div v-if="visible && resolution" class="intervention-overlay" data-testid="party-intervention">
    <section class="intervention-card" role="dialog" aria-modal="true">
      <header>
        <p class="kicker">
          <Coins :size="18" aria-hidden="true" />
          惩罚干预时间
        </p>
        <h2>有人要出手吗？</h2>
        <p>
          {{ targetPlayer?.name ?? '当前玩家' }} 将执行
          {{ punishmentCount }}；本回合只能使用一枚筹码。
        </p>
        <span class="countdown">
          <Timer :size="15" aria-hidden="true" />
          {{ secondsRemaining }} 秒后沿用原惩罚
        </span>
      </header>

      <div class="player-options">
        <p v-if="options.length === 0" class="private-options-note">
          可用筹码与操作已发送到各自手机；主屏不会显示私密选择。
        </p>
        <article v-for="option in options" :key="option.playerIndex" class="player-option">
          <div class="player-heading">
            <span
              class="player-dot"
              :style="{ backgroundColor: players[option.playerIndex]?.color }"
            ></span>
            <strong>{{ players[option.playerIndex]?.name }}</strong>
            <small>{{ tokensRemaining[option.playerIndex] ?? 0 }} 枚</small>
          </div>

          <div class="option-actions">
            <div v-if="option.actions.includes('transfer')" class="transfer-action">
              <select
                v-model.number="transferTargets[option.playerIndex]"
                :aria-label="`${players[option.playerIndex]?.name}的转嫁目标`"
              >
                <option
                  v-for="targetIndex in option.transferTargetPlayerIndices"
                  :key="targetIndex"
                  :value="targetIndex"
                >
                  转给 {{ players[targetIndex]?.name }}
                </option>
              </select>
              <button
                type="button"
                class="action-button action-button--transfer"
                @click="
                  apply({
                    action: 'transfer',
                    playerIndex: option.playerIndex,
                    targetPlayerIndex: transferTargets[option.playerIndex],
                  })
                "
              >
                <ArrowRightLeft :size="17" aria-hidden="true" />
                转嫁
              </button>
            </div>

            <button
              v-if="option.actions.includes('immunity')"
              type="button"
              class="action-button action-button--immunity"
              @click="apply({ action: 'immunity', playerIndex: option.playerIndex })"
            >
              <Ban :size="17" aria-hidden="true" />
              免疫本次惩罚
            </button>

            <button
              v-if="option.actions.includes('amplify')"
              type="button"
              class="action-button action-button--amplify"
              @click="apply({ action: 'amplify', playerIndex: option.playerIndex })"
            >
              <Flame :size="17" aria-hidden="true" />
              加码为 2 倍
            </button>
          </div>
        </article>
      </div>

      <button type="button" class="skip-button" data-testid="party-intervention-skip" @click="skip">
        都不使用，沿用原惩罚
      </button>
    </section>
  </div>
</template>

<style scoped>
  .intervention-overlay {
    position: fixed;
    z-index: 2270;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    overflow-y: auto;
    background: rgb(2 6 23 / 0.78);
    backdrop-filter: blur(8px);
  }

  .intervention-card {
    width: min(680px, 100%);
    max-height: calc(100dvh - 2rem);
    padding: clamp(1.2rem, 4vw, 2rem);
    overflow-y: auto;
    color: #f8fafc;
    background:
      radial-gradient(circle at top, rgb(245 158 11 / 0.16), transparent 42%), rgb(15 23 42 / 0.98);
    border: 1px solid rgb(251 191 36 / 0.48);
    border-radius: 24px;
  }

  header {
    text-align: center;
  }

  header h2 {
    margin: 0.55rem 0;
  }

  header > p:not(.kicker) {
    margin: 0;
    color: #cbd5e1;
  }

  .kicker,
  .countdown {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #fde68a;
  }

  .countdown {
    margin-top: 0.65rem;
    font-size: 0.86rem;
  }

  .player-options {
    display: grid;
    gap: 0.75rem;
    margin-top: 1.2rem;
  }

  .private-options-note {
    margin: 0;
    padding: 1rem;
    color: #cbd5e1;
    text-align: center;
    background: rgb(30 41 59 / 0.72);
    border: 1px dashed rgb(148 163 184 / 0.28);
    border-radius: 14px;
  }

  .player-option {
    padding: 0.9rem;
    background: rgb(51 65 85 / 0.55);
    border: 1px solid rgb(148 163 184 / 0.2);
    border-radius: 16px;
  }

  .player-heading {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .player-heading small {
    margin-left: auto;
    color: #fde68a;
  }

  .player-dot {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgb(255 255 255 / 0.3);
    border-radius: 50%;
  }

  .option-actions,
  .transfer-action {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.7rem;
  }

  .transfer-action {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-top: 0;
  }

  select,
  .action-button,
  .skip-button {
    min-height: 44px;
    border-radius: 11px;
    font: inherit;
  }

  select {
    padding: 0.55rem;
    color: #f8fafc;
    background: #1e293b;
    border: 1px solid #64748b;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 0.85rem;
    color: white;
    font-weight: 720;
    border: 1px solid transparent;
    cursor: pointer;
  }

  .action-button--transfer {
    background: #2563eb;
  }

  .action-button--immunity {
    background: #047857;
  }

  .action-button--amplify {
    background: #b45309;
  }

  .skip-button {
    width: 100%;
    margin-top: 1rem;
    color: #cbd5e1;
    background: transparent;
    border: 1px solid rgb(148 163 184 / 0.28);
    cursor: pointer;
  }

  @media (max-width: 520px) {
    .transfer-action {
      grid-template-columns: 1fr;
    }
  }
</style>
