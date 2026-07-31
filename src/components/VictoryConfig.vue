<script setup lang="ts">
  import { computed } from 'vue'
  import { Flag, TrendingDown } from '@lucide/vue'
  import type { VictoryConfig } from '../types/game'
  import { normalizeVictoryConfig } from '../services/victorySettlement'

  const props = defineProps<{ config: VictoryConfig; playerCount: number }>()
  const emit = defineEmits<{ (event: 'update', config: VictoryConfig): void }>()

  const update = (patch: Partial<VictoryConfig>) => {
    emit('update', normalizeVictoryConfig({ ...props.config, ...patch }))
  }

  const lastPlaceCount = computed(() =>
    props.config.loserGradientEnabled
      ? props.config.baseCount + Math.max(0, props.playerCount - 2) * props.config.gradientStep
      : props.config.baseCount
  )
</script>

<template>
  <section class="victory-config" aria-labelledby="victory-config-title">
    <header>
      <span class="config-icon"><Flag :size="21" aria-hidden="true" /></span>
      <div>
        <h2 id="victory-config-title">终局奖惩</h2>
        <p>胜者执行动作；可让排名越后的玩家次数越高。</p>
      </div>
    </header>

    <div class="config-grid">
      <label class="field field--wide">
        <span>奖惩动作</span>
        <input
          :value="config.actionText"
          type="text"
          maxlength="80"
          placeholder="例如：用手掌打屁股"
          @input="update({ actionText: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <label class="field">
        <span>基础次数</span>
        <input
          :value="config.baseCount"
          type="number"
          min="0"
          max="999"
          inputmode="numeric"
          @input="update({ baseCount: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <label class="field">
        <span>单位</span>
        <input
          :value="config.countUnit"
          type="text"
          maxlength="8"
          placeholder="下"
          @input="update({ countUnit: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </div>

    <label class="gradient-toggle">
      <input
        :checked="config.loserGradientEnabled"
        type="checkbox"
        @change="update({ loserGradientEnabled: ($event.target as HTMLInputElement).checked })"
      />
      <span>
        <strong>
          <TrendingDown :size="17" aria-hidden="true" />
          启用败者惩罚梯度
        </strong>
        <small>同一进度的玩家同档，最后一名最重。</small>
      </span>
    </label>

    <label v-if="config.loserGradientEnabled" class="field gradient-step">
      <span>每落后一档增加</span>
      <div>
        <input
          :value="config.gradientStep"
          type="number"
          min="0"
          max="999"
          inputmode="numeric"
          @input="update({ gradientStep: Number(($event.target as HTMLInputElement).value) })"
        />
        <span>{{ config.countUnit }}</span>
      </div>
    </label>

    <div class="settlement-preview" aria-label="终局奖惩预览">
      <p>预览：胜者对第二名{{ config.actionText }} {{ config.baseCount }}{{ config.countUnit }}</p>
      <p v-if="config.loserGradientEnabled && playerCount > 2">
        最后一名为 {{ lastPlaceCount }}{{ config.countUnit }}
      </p>
    </div>
  </section>
</template>

<style scoped>
  .victory-config {
    margin-top: 1.25rem;
    padding: clamp(1rem, 3vw, 1.35rem);
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(251 191 36 / 0.25);
    border-radius: var(--radius-xl);
    backdrop-filter: blur(var(--glass-blur));
  }

  header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  header h2,
  header p {
    margin: 0;
  }

  header h2 {
    font-size: 1.05rem;
  }

  header p {
    margin-top: 0.2rem;
    color: var(--text-muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .config-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    color: #fde68a;
    background: rgb(245 158 11 / 0.14);
    border-radius: 12px;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .field {
    display: grid;
    gap: 0.4rem;
  }

  .field--wide {
    grid-column: 1 / -1;
  }

  .field > span {
    color: #cbd5e1;
    font-size: 0.78rem;
    font-weight: 700;
  }

  input[type='text'],
  input[type='number'] {
    width: 100%;
    min-height: 44px;
    padding: 0.65rem 0.75rem;
    color: #f8fafc;
    background: rgb(15 23 42 / 0.82);
    border: 1px solid rgb(148 163 184 / 0.3);
    border-radius: 10px;
    font: inherit;
  }

  .gradient-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    margin-top: 1rem;
    padding: 0.8rem;
    background: rgb(245 158 11 / 0.08);
    border: 1px solid rgb(245 158 11 / 0.2);
    border-radius: 12px;
    cursor: pointer;
  }

  .gradient-toggle input {
    width: 18px;
    height: 18px;
    margin-top: 0.1rem;
    accent-color: #f59e0b;
  }

  .gradient-toggle span,
  .gradient-toggle strong {
    display: grid;
    gap: 0.2rem;
  }

  .gradient-toggle strong {
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  .gradient-toggle small {
    color: var(--text-muted);
    line-height: 1.4;
  }

  .gradient-step {
    margin-top: 0.8rem;
  }

  .gradient-step > div {
    display: grid;
    grid-template-columns: minmax(0, 150px) auto;
    align-items: center;
    gap: 0.5rem;
  }

  .settlement-preview {
    margin-top: 0.9rem;
    padding: 0.75rem;
    color: #fde68a;
    background: rgb(245 158 11 / 0.08);
    border-radius: 10px;
    font-size: 0.8rem;
  }

  .settlement-preview p {
    margin: 0;
  }

  .settlement-preview p + p {
    margin-top: 0.25rem;
  }

  @media (max-width: 520px) {
    .config-grid {
      grid-template-columns: 1fr;
    }

    .field--wide {
      grid-column: auto;
    }
  }
</style>
