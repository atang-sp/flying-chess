<script setup lang="ts">
import { computed } from 'vue'
import type { PlayerView, RequiredAction } from '../../types/network'

const props = defineProps<{
  view: PlayerView
}>()

const emit = defineEmits<{
  action: [payload: { type: string; [key: string]: unknown }]
}>()

const pending = computed<RequiredAction | null>(() => props.view.pendingAction)

function send(payload: { type: string; [key: string]: unknown }): void {
  if (navigator.vibrate) navigator.vibrate(30)
  emit('action', payload)
}
</script>

<template>
  <div v-if="pending" class="action-panel">
    <!-- Prediction: low / high -->
    <div v-if="pending.type === 'predict'" class="action-group">
      <p class="action-prompt">预测骰子范围</p>
      <div class="action-buttons">
        <button class="btn btn-secondary action-btn" @click="send({ type: 'predict', prediction: 'low' })">
          ⬇️ 小 (1-3)
        </button>
        <button class="btn btn-secondary action-btn" @click="send({ type: 'predict', prediction: 'high' })">
          ⬆️ 大 (4-6)
        </button>
      </div>
    </div>

    <!-- Reaction decision: keep / mirror -->
    <div v-else-if="pending.type === 'reaction_decision'" class="action-group">
      <p class="action-prompt">预测成功！骰子点数: {{ pending.rolledValue }}</p>
      <div class="action-buttons">
        <button class="btn btn-secondary action-btn" @click="send({ type: 'reaction_decision', decision: 'keep' })">
          保留 {{ pending.rolledValue }}
        </button>
        <button class="btn btn-primary action-btn" @click="send({ type: 'reaction_decision', decision: 'mirror' })">
          镜像 → {{ 7 - (pending.rolledValue ?? 0) }}
        </button>
      </div>
    </div>

    <!-- Dice decision: continue / reroll -->
    <div v-else-if="pending.type === 'dice_decision'" class="action-group">
      <p class="action-prompt">骰子结果: <strong>{{ pending.diceValue }}</strong></p>
      <div class="action-buttons">
        <button class="btn btn-primary action-btn" @click="send({ type: 'continue_move' })">
          继续移动
        </button>
        <button
          v-if="pending.canReroll"
          class="btn btn-secondary action-btn"
          @click="send({ type: 'reroll' })"
        >
          🎫 重掷
        </button>
      </div>
    </div>

    <!-- Punishment choice -->
    <div v-else-if="pending.type === 'punishment_choice'" class="action-group">
      <p class="action-prompt">选择惩罚（消耗 1 筹码）</p>
      <div class="action-buttons vertical">
        <button class="btn btn-secondary action-btn" @click="send({ type: 'select_punishment', index: 0 })">
          {{ pending.choiceA }}
        </button>
        <button class="btn btn-secondary action-btn" @click="send({ type: 'select_punishment', index: 1 })">
          {{ pending.choiceB }}
        </button>
        <button class="btn-ghost" @click="send({ type: 'skip_punishment_choice' })">
          跳过（不消耗筹码）
        </button>
      </div>
    </div>

    <!-- Acknowledge -->
    <div v-else-if="pending.type === 'acknowledge'" class="action-group">
      <p class="action-prompt">{{ pending.message }}</p>
      <button class="btn btn-primary action-btn" @click="send({ type: 'acknowledge' })">
        确认
      </button>
    </div>

    <!-- Tiebreak roll -->
    <div v-else-if="pending.type === 'tiebreak_roll'" class="action-group">
      <p class="action-prompt">并列决胜</p>
      <button class="btn btn-primary action-btn dice-btn" @click="send({ type: 'tiebreak_roll' })">
        🎲 掷骰子
      </button>
    </div>

    <!-- Roll dice (explicit action required) -->
    <div v-else-if="pending.type === 'roll_dice'" class="action-group">
      <button class="btn btn-primary action-btn dice-btn" @click="send({ type: 'roll_dice' })">
        🎲 掷骰子
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
</style>
