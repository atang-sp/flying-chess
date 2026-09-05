<script setup lang="ts">
import {
  Settings,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Target
} from '@lucide/vue'

import BoardConfigPanel from '../components/BoardConfig.vue'
import PunishmentConfigPanel from '../components/PunishmentConfig.vue'
import TrapConfigPanel from '../components/TrapConfig.vue'
import PunishmentConfirmation from '../components/PunishmentConfirmation.vue'

import type { BoardConfig, PunishmentConfig, PunishmentCombination } from '@flying-chess/game-core/types'

const props = defineProps<{
  settingsTab: 'board' | 'punishment' | 'trap'
  punishmentStep: 'config' | 'confirm'
  stepCompleted: { board: boolean; punishment: boolean; trap: boolean }
  allConfigValid: boolean
  boardConfig: BoardConfig | null
  punishmentConfig: PunishmentConfig | null
  trapConfig: Record<string, any>
  punishmentCombinations: PunishmentCombination[]
}>()

const emit = defineEmits<{
  (e: 'update:settingsTab', val: 'board' | 'punishment' | 'trap'): void
  (e: 'update:punishmentStep', val: 'config' | 'confirm'): void
  (e: 'update:boardConfig', config: BoardConfig): void
  (e: 'update:punishmentConfig', config: PunishmentConfig): void
  (e: 'update:trapConfig', config: Record<string, any>): void
  (e: 'validation-failed', error: Error): void
  (e: 'generate-punishment-combinations'): void
  (e: 'confirm-punishment-combinations', combinations: PunishmentCombination[]): void
  (e: 'prev-step'): void
  (e: 'next-step'): void
  (e: 'show-intro'): void
}>()
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
          @click="emit('update:settingsTab', 'board')"
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
          @click="emit('update:settingsTab', 'punishment')"
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
          @click="emit('update:settingsTab', 'trap')"
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
        @back-to-settings="emit('update:punishmentStep', 'config')"
      />

      <!-- Tab 内容（仅在配置阶段显示） -->
      <div v-else class="settings-tab-content">
        <BoardConfigPanel
          v-show="settingsTab === 'board'"
          :config="boardConfig"
          @update="emit('update:boardConfig', $event)"
        />

        <PunishmentConfigPanel
          v-show="settingsTab === 'punishment'"
          :config="punishmentConfig"
          @update="emit('update:punishmentConfig', $event)"
          @validation-failed="emit('validation-failed', $event)"
        />

        <TrapConfigPanel
          v-show="settingsTab === 'trap'"
          :traps="trapConfig"
          @update="emit('update:trapConfig', $event)"
        />
      </div>

      <!-- 上下文操作按钮 -->
      <div v-if="punishmentStep === 'config'" class="page-actions">
        <button v-if="settingsTab !== 'board'" class="btn btn-secondary" @click="emit('prev-step')">
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
          @click="emit('generate-punishment-combinations')"
        >
          <Target :size="16" />
          <span class="btn-text">生成惩罚组合</span>
        </button>
        <button v-else class="btn btn-primary" @click="emit('next-step')">
          <span class="btn-text">下一步</span>
          <ArrowRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>
