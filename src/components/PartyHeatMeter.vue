<script setup lang="ts">
  import { computed } from 'vue'
  import {
    PARTY_FINALE_THRESHOLD,
    PARTY_HEATING_THRESHOLD,
    PARTY_HEAT_MAX,
  } from '@flying-chess/game-core/party-momentum'
  import type { PartyAct } from '@flying-chess/game-core/party-mode'

  const props = withDefaults(
    defineProps<{
      heat: number
      act: PartyAct
      currentPlayerContribution: number
      heatLimitPending?: boolean
      rewardNotice?: string
    }>(),
    {
      heatLimitPending: false,
      rewardNotice: '',
    }
  )

  const stageLabel = computed(() => {
    if (props.act === 'finale') return '终局阶段'
    if (props.act === 'heating') return '升温阶段'
    return '暖场阶段'
  })

  const nextThresholdLabel = computed(() => {
    if (props.heat < PARTY_HEATING_THRESHOLD) {
      return `距离升温还差 ${PARTY_HEATING_THRESHOLD - props.heat}`
    }
    if (props.heat < PARTY_FINALE_THRESHOLD) {
      return `距离终局还差 ${PARTY_FINALE_THRESHOLD - props.heat}`
    }
    if (props.heat < PARTY_HEAT_MAX) {
      return `距离满格还差 ${PARTY_HEAT_MAX - props.heat}`
    }
    return props.heatLimitPending ? '当前完整轮次结束后进入结算' : '热度已满'
  })

  const boundedHeat = computed(() => Math.min(PARTY_HEAT_MAX, Math.max(0, props.heat)))
</script>

<template>
  <section class="party-heat-meter" aria-label="Party 全局热度">
    <div class="party-heat-meter__summary">
      <div>
        <span class="party-heat-meter__eyebrow">全局热度</span>
        <strong>{{ boundedHeat }} / {{ PARTY_HEAT_MAX }}</strong>
      </div>
      <div class="party-heat-meter__stage">
        <strong>{{ stageLabel }}</strong>
        <span>{{ nextThresholdLabel }}</span>
      </div>
      <span class="party-heat-meter__contribution">
        当前玩家贡献 {{ currentPlayerContribution }}
      </span>
    </div>

    <div
      class="party-heat-meter__track"
      role="progressbar"
      aria-label="Party 全局热度进度"
      :aria-valuemin="0"
      :aria-valuemax="PARTY_HEAT_MAX"
      :aria-valuenow="boundedHeat"
    >
      <span class="party-heat-meter__fill" :style="{ width: `${boundedHeat}%` }"></span>
      <span
        class="party-heat-meter__node party-heat-meter__node--heating"
        :class="{ 'party-heat-meter__node--reached': boundedHeat >= PARTY_HEATING_THRESHOLD }"
      >
        30
      </span>
      <span
        class="party-heat-meter__node party-heat-meter__node--finale"
        :class="{ 'party-heat-meter__node--reached': boundedHeat >= PARTY_FINALE_THRESHOLD }"
      >
        70
      </span>
      <span
        class="party-heat-meter__node party-heat-meter__node--maximum"
        :class="{ 'party-heat-meter__node--reached': boundedHeat >= PARTY_HEAT_MAX }"
      >
        100
      </span>
    </div>

    <p v-if="rewardNotice" class="party-heat-meter__reward" role="status" aria-live="polite">
      {{ rewardNotice }}
    </p>
  </section>
</template>

<style scoped>
  .party-heat-meter {
    --party-heat: #f97316;
    display: grid;
    gap: 0.65rem;
    margin: 0 1rem;
    padding: 0.8rem 1rem 1rem;
    color: #fff7ed;
    background: linear-gradient(135deg, rgba(30, 20, 18, 0.96), rgba(50, 25, 19, 0.9));
    border: 1px solid rgba(251, 146, 60, 0.35);
    border-radius: 14px;
    box-shadow: 0 10px 28px rgba(15, 8, 5, 0.22);
  }

  .party-heat-meter__summary {
    display: grid;
    grid-template-columns: minmax(100px, auto) minmax(150px, 1fr) auto;
    align-items: center;
    gap: 1rem;
  }

  .party-heat-meter__summary > div,
  .party-heat-meter__stage {
    display: grid;
    gap: 0.12rem;
  }

  .party-heat-meter__eyebrow,
  .party-heat-meter__stage span,
  .party-heat-meter__contribution {
    color: #fed7aa;
    font-size: 0.78rem;
  }

  .party-heat-meter__summary strong {
    font-size: 1rem;
  }

  .party-heat-meter__track {
    position: relative;
    height: 0.68rem;
    margin: 0 1.3rem 0.55rem 0;
    background: rgba(255, 247, 237, 0.16);
    border-radius: 999px;
  }

  .party-heat-meter__fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #facc15, var(--party-heat), #ef4444);
    border-radius: inherit;
    transition: width 240ms ease;
  }

  .party-heat-meter__node {
    position: absolute;
    top: 50%;
    translate: -50% -50%;
    display: grid;
    place-items: center;
    min-width: 1.55rem;
    height: 1.55rem;
    padding: 0 0.18rem;
    color: #332018;
    background: #ffedd5;
    border: 2px solid #7c2d12;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 800;
  }

  .party-heat-meter__node--heating {
    left: 30%;
  }

  .party-heat-meter__node--finale {
    left: 70%;
  }

  .party-heat-meter__node--maximum {
    left: 100%;
  }

  .party-heat-meter__node--reached {
    color: #fff;
    background: #c2410c;
    border-color: #fdba74;
  }

  .party-heat-meter__reward {
    margin: 0;
    color: #fef08a;
    font-size: 0.85rem;
    font-weight: 700;
  }

  @media (max-width: 680px) {
    .party-heat-meter {
      margin: 0.65rem 0.75rem 0;
      padding: 0.7rem 0.8rem 0.85rem;
    }

    .party-heat-meter__summary {
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 0.8rem;
    }

    .party-heat-meter__contribution {
      grid-column: 1 / -1;
    }
  }
</style>
