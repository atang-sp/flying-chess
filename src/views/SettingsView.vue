<script setup lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any */
  import { Settings, Check, AlertCircle, ArrowLeft, ArrowRight, Target } from '@lucide/vue'

  import BoardConfigPanel from '../components/BoardConfig.vue'
  import PunishmentConfigPanel from '../components/PunishmentConfig.vue'
  import TrapConfigPanel from '../components/TrapConfig.vue'
  import PunishmentConfirmation from '../components/PunishmentConfirmation.vue'

  import type {
    BoardConfig,
    PunishmentConfig,
    PunishmentCombination,
  } from '@flying-chess/game-core/types'

  import { ref, computed } from 'vue'

  const props = defineProps<{
    boardConfig: BoardConfig | null
    punishmentConfig: PunishmentConfig | null
    trapConfig: any[]
    punishmentCombinations: PunishmentCombination[]
    isPartyGame: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:boardConfig', config: BoardConfig): void
    (e: 'update:punishmentConfig', config: PunishmentConfig): void
    (e: 'update:trapConfig', config: any[]): void
    (e: 'validation-failed', error: Error): void
    (e: 'generate-punishment-combinations'): void
    (e: 'confirm-punishment-combinations', combinations: PunishmentCombination[]): void
    (e: 'show-intro'): void
  }>()

  const settingsTab = ref<'board' | 'punishment' | 'trap'>('board')
  const punishmentStep = ref<'config' | 'confirm'>('config')

  const stepCompleted = computed(() => ({
    board: true, // simplified for now, as validation is handled by components
    punishment: true,
    trap: true,
  }))

  const allConfigValid = computed(() => {
    return stepCompleted.value.board && stepCompleted.value.punishment && stepCompleted.value.trap
  })

  function handleNextStep() {
    if (settingsTab.value === 'board') settingsTab.value = 'punishment'
    else if (settingsTab.value === 'punishment') settingsTab.value = 'trap'
  }

  function handlePrevStep() {
    if (settingsTab.value === 'trap') settingsTab.value = 'punishment'
    else if (settingsTab.value === 'punishment') settingsTab.value = 'board'
  }
</script>

<template>
  <div class="settings-page">
    <div class="page-container">
      <div class="settings-header">
        <h2>
          <Settings :size="24" />
          游戏设置
        </h2>
        <p>配置棋盘、惩罚和陷阱</p>
      </div>

      <!-- Stepper 步骤指示器 -->
      <div v-if="punishmentStep === 'config'" class="settings-stepper">
        <button
          class="stepper-item"
          :class="{
            'stepper-item--active': settingsTab === 'board',
            'stepper-item--completed': stepCompleted.board && settingsTab !== 'board',
            'stepper-item--invalid': !stepCompleted.board && settingsTab !== 'board',
          }"
          @click="settingsTab = 'board'"
        >
          <span class="stepper-number">
            <Check v-if="stepCompleted.board && settingsTab !== 'board'" :size="14" />
            <AlertCircle v-else-if="!stepCompleted.board && settingsTab !== 'board'" :size="14" />
            <span v-else>1</span>
          </span>
          <span class="stepper-label">棋盘</span>
        </button>

        <span
          class="stepper-connector"
          :class="{ 'stepper-connector--done': stepCompleted.board }"
        ></span>

        <button
          class="stepper-item"
          :class="{
            'stepper-item--active': settingsTab === 'punishment',
            'stepper-item--completed': stepCompleted.punishment && settingsTab !== 'punishment',
            'stepper-item--invalid': !stepCompleted.punishment && settingsTab !== 'punishment',
          }"
          @click="settingsTab = 'punishment'"
        >
          <span class="stepper-number">
            <Check v-if="stepCompleted.punishment && settingsTab !== 'punishment'" :size="14" />
            <AlertCircle
              v-else-if="!stepCompleted.punishment && settingsTab !== 'punishment'"
              :size="14"
            />
            <span v-else>2</span>
          </span>
          <span class="stepper-label">惩罚</span>
        </button>

        <span
          class="stepper-connector"
          :class="{ 'stepper-connector--done': stepCompleted.punishment }"
        ></span>

        <button
          class="stepper-item"
          :class="{
            'stepper-item--active': settingsTab === 'trap',
            'stepper-item--completed': stepCompleted.trap && settingsTab !== 'trap',
            'stepper-item--invalid': !stepCompleted.trap && settingsTab !== 'trap',
          }"
          @click="settingsTab = 'trap'"
        >
          <span class="stepper-number">
            <Check v-if="stepCompleted.trap && settingsTab !== 'trap'" :size="14" />
            <AlertCircle v-else-if="!stepCompleted.trap && settingsTab !== 'trap'" :size="14" />
            <span v-else>3</span>
          </span>
          <span class="stepper-label">陷阱</span>
        </button>
      </div>

      <!-- 确认页面（独立于 Tab 内容） -->
      <PunishmentConfirmation
        v-if="punishmentStep === 'confirm'"
        :combinations="punishmentCombinations"
        @confirm="emit('confirm-punishment-combinations', $event)"
        @regenerate="emit('generate-punishment-combinations')"
        @back-to-settings="punishmentStep = 'config'"
      />

      <!-- Tab 内容（仅在配置阶段显示） -->
      <div v-else class="settings-tab-content">
        <BoardConfigPanel
          v-show="settingsTab === 'board'"
          :config="boardConfig!"
          @update="emit('update:boardConfig', $event)"
        />

        <PunishmentConfigPanel
          v-show="settingsTab === 'punishment'"
          :config="punishmentConfig!"
          @update="emit('update:punishmentConfig', $event)"
          @validation-failed="msg => emit('validation-failed', new Error(msg))"
        />

        <TrapConfigPanel
          v-show="settingsTab === 'trap'"
          :traps="trapConfig"
          @update="emit('update:trapConfig', $event)"
        />
      </div>

      <!-- 上下文操作按钮 -->
      <div v-if="punishmentStep === 'config'" class="page-actions">
        <button v-if="settingsTab !== 'board'" class="btn btn-secondary" @click="handlePrevStep()">
          <ArrowLeft :size="16" />
          <span class="btn-text">上一步</span>
        </button>
        <button v-else class="btn btn-secondary" @click="emit('show-intro')">
          <ArrowLeft :size="16" />
          <span class="btn-text">返回首页</span>
        </button>

        <button
          v-if="settingsTab === 'trap'"
          class="btn btn-primary"
          :disabled="!allConfigValid"
          @click="
            emit('generate-punishment-combinations')
            punishmentStep = 'confirm'
          "
        >
          <Target :size="16" />
          <span class="btn-text">生成惩罚组合</span>
        </button>
        <button v-else class="btn btn-primary" @click="handleNextStep()">
          <span class="btn-text">下一步</span>
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>
