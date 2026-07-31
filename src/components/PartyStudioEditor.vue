<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { GripVertical, Palette, SlidersHorizontal } from '@lucide/vue'
  import type { BoardConfig } from '../types/game'
  import {
    createLayoutFromBoardConfig,
    validatePartyStudioConfig,
    type PartyStudioCellKind,
    type PartyStudioConfig,
    type PartyStudioTheme,
  } from '../services/partyStudio'
  import type { PartyAct, PartyDirectorConfig } from '../services/partyMode'

  const props = defineProps<{ config: PartyStudioConfig }>()
  const emit = defineEmits<{ (event: 'update', config: PartyStudioConfig): void }>()
  const draggedIndex = ref<number | null>(null)
  const validation = computed(() => validatePartyStudioConfig(props.config))

  const boardFields: readonly { key: keyof BoardConfig; label: string }[] = [
    { key: 'totalCells', label: '总格数' },
    { key: 'punishmentCells', label: '惩罚' },
    { key: 'chainPunishmentCells', label: '连锁' },
    { key: 'trapCells', label: '机关' },
    { key: 'qaCells', label: '问答' },
    { key: 'dareCells', label: '指令' },
    { key: 'bonusCells', label: '奖励' },
    { key: 'reverseCells', label: '后退' },
    { key: 'restCells', label: '休息' },
    { key: 'restartCells', label: '重启' },
  ]
  const cellLabels: Record<PartyStudioCellKind, string> = {
    punishment: '惩',
    chain_punishment: '链',
    bonus: '奖',
    reverse: '退',
    rest: '休',
    restart: '启',
    trap: '机',
    qa: '问',
    dare: '令',
  }

  const update = (patch: Partial<PartyStudioConfig>) => {
    emit('update', { ...props.config, ...patch })
  }
  const updateDirector = (key: keyof PartyDirectorConfig, value: number) => {
    update({ director: { ...props.config.director, [key]: value } })
  }
  const updateBoard = (key: keyof BoardConfig, value: number) => {
    const boardConfig = { ...props.config.boardConfig, [key]: Math.max(0, Math.trunc(value)) }
    try {
      update({ boardConfig, cellLayout: createLayoutFromBoardConfig(boardConfig) })
    } catch {
      update({ boardConfig })
    }
  }
  const updatePool = (pool: 'qaQuestions' | 'dareInstructions', act: PartyAct, value: string) => {
    const entries = value
      .split('\n')
      .map(entry => entry.trim())
      .filter(Boolean)
    update({
      [pool]: {
        ...props.config[pool],
        [act]: entries,
      },
    })
  }
  const updateTheme = (patch: Partial<PartyStudioConfig['theme']>) => {
    update({ theme: { ...props.config.theme, ...patch } })
  }
  const dropCell = (targetIndex: number) => {
    if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
    const layout = [...props.config.cellLayout]
    ;[layout[draggedIndex.value], layout[targetIndex]] = [
      layout[targetIndex],
      layout[draggedIndex.value],
    ]
    draggedIndex.value = null
    update({ cellLayout: layout })
  }
</script>

<template>
  <details class="studio-editor">
    <summary>
      <span>
        <SlidersHorizontal :size="19" />
        Party Studio 场景编辑器
      </span>
      <small>{{ config.enabled ? config.name : '未启用，内置场景保持不变' }}</small>
    </summary>

    <div class="studio-body">
      <label class="enable-toggle">
        <input
          :checked="config.enabled"
          type="checkbox"
          @change="update({ enabled: ($event.target as HTMLInputElement).checked })"
        />
        <span>
          <strong>本局使用自定义场景</strong>
          <small>关闭时继续使用上方四个内置预设。</small>
        </span>
      </label>

      <label class="field">
        <span>场景名称</span>
        <input
          :value="config.name"
          maxlength="60"
          @change="update({ name: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <section>
        <h3>幕数与时间门控</h3>
        <div class="field-grid">
          <label class="field">
            <span>幕数</span>
            <select
              :value="config.director.actCount"
              @change="
                updateDirector('actCount', Number(($event.target as HTMLSelectElement).value))
              "
            >
              <option :value="1">1 幕</option>
              <option :value="2">2 幕</option>
              <option :value="3">3 幕</option>
            </select>
          </label>
          <label
            v-for="field in [
              ['heatingRound', '升温轮次'],
              ['finaleRound', '终局轮次'],
              ['heatingAfterMinutes', '升温分钟'],
              ['finaleAfterMinutes', '终局分钟'],
              ['endAfterMinutes', '结束分钟'],
            ] as const"
            :key="field[0]"
            class="field"
          >
            <span>{{ field[1] }}</span>
            <input
              type="number"
              min="1"
              :value="config.director[field[0]]"
              @change="updateDirector(field[0], Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>
      </section>

      <section>
        <h3>格子比例</h3>
        <div class="board-fields">
          <label v-for="field in boardFields" :key="field.key" class="field">
            <span>{{ field.label }}</span>
            <input
              type="number"
              :min="field.key === 'totalCells' ? 20 : 0"
              :max="field.key === 'totalCells' ? 100 : 98"
              :value="config.boardConfig[field.key] ?? 0"
              @change="updateBoard(field.key, Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>
      </section>

      <section>
        <h3>
          <GripVertical :size="17" />
          可视化棋盘（拖拽交换格子类型）
        </h3>
        <div class="cell-layout" aria-label="自定义棋盘布局">
          <button
            v-for="(kind, index) in config.cellLayout"
            :key="index"
            type="button"
            draggable="true"
            :class="`cell--${kind}`"
            :title="`第 ${index + 2} 格：${kind}`"
            @dragstart="draggedIndex = index"
            @dragover.prevent
            @drop="dropCell(index)"
          >
            <span>{{ index + 2 }}</span>
            {{ cellLabels[kind] }}
          </button>
        </div>
      </section>

      <section>
        <h3>Q&A 与 Dare 内容池</h3>
        <div class="content-pools">
          <template v-for="act in ['warmup', 'heating', 'finale'] as const" :key="act">
            <label class="field">
              <span>{{ act }} · Q&A（每行一条）</span>
              <textarea
                :value="config.qaQuestions[act].join('\n')"
                rows="4"
                @change="
                  updatePool('qaQuestions', act, ($event.target as HTMLTextAreaElement).value)
                "
              ></textarea>
            </label>
            <label class="field">
              <span>{{ act }} · Dare（每行一条）</span>
              <textarea
                :value="config.dareInstructions[act].join('\n')"
                rows="4"
                @change="
                  updatePool('dareInstructions', act, ($event.target as HTMLTextAreaElement).value)
                "
              ></textarea>
            </label>
          </template>
        </div>
      </section>

      <section>
        <h3>
          <Palette :size="17" />
          主题
        </h3>
        <div class="theme-fields">
          <select
            :value="config.theme.preset"
            @change="
              updateTheme({
                preset: ($event.target as HTMLSelectElement).value as PartyStudioTheme,
              })
            "
          >
            <option value="aurora">极光紫</option>
            <option value="ember">余烬红</option>
            <option value="midnight">午夜蓝</option>
          </select>
          <input
            :value="config.theme.accentColor"
            type="color"
            aria-label="主题强调色"
            @input="updateTheme({ accentColor: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </section>

      <p class="validation" :class="{ invalid: !validation.ok }">
        {{ validation.ok ? '配置有效，可用于下一局升温局。' : validation.error }}
      </p>
    </div>
  </details>
</template>

<style scoped>
  .studio-editor {
    margin-top: 1rem;
    color: var(--text-primary);
    text-align: left;
    background: rgb(15 23 42 / 0.58);
    border: 1px solid rgb(236 72 153 / 0.28);
    border-radius: var(--radius-xl);
  }

  summary,
  summary span,
  h3 {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  summary {
    justify-content: space-between;
    min-height: 58px;
    padding: 0.85rem 1rem;
    cursor: pointer;
  }

  summary small,
  .enable-toggle small {
    color: var(--text-muted);
  }

  .studio-body {
    display: grid;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }

  .enable-toggle {
    display: flex;
    gap: 0.65rem;
    padding: 0.75rem;
    background: rgb(131 24 67 / 0.2);
    border-radius: 12px;
  }

  .enable-toggle span,
  .field {
    display: grid;
    gap: 0.35rem;
  }

  h3 {
    margin: 0 0 0.6rem;
    font-size: 0.95rem;
  }

  .field > span {
    color: #cbd5e1;
    font-size: 0.74rem;
    font-weight: 700;
  }

  input,
  select,
  textarea {
    width: 100%;
    min-height: 42px;
    padding: 0.55rem 0.65rem;
    color: #f8fafc;
    background: #0f172a;
    border: 1px solid rgb(148 163 184 / 0.3);
    border-radius: 9px;
    font: inherit;
  }

  textarea {
    line-height: 1.45;
    resize: vertical;
  }

  .field-grid,
  .board-fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 0.55rem;
  }

  .content-pools {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
  }

  .cell-layout {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
    gap: 0.35rem;
  }

  .cell-layout button {
    display: grid;
    place-items: center;
    min-height: 45px;
    color: #f8fafc;
    background: #334155;
    border: 1px solid rgb(255 255 255 / 0.2);
    border-radius: 8px;
    cursor: grab;
  }

  .cell-layout button span {
    font-size: 0.58rem;
    opacity: 0.65;
  }

  .cell--punishment {
    background: #991b1b !important;
  }
  .cell--chain_punishment {
    background: #7c2d12 !important;
  }
  .cell--trap {
    background: #581c87 !important;
  }
  .cell--qa {
    background: #1d4ed8 !important;
  }
  .cell--dare {
    background: #b45309 !important;
  }

  .theme-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px;
    gap: 0.55rem;
  }

  .theme-fields input[type='color'] {
    padding: 0.2rem;
  }

  .validation {
    margin: 0;
    color: #86efac;
    font-size: 0.8rem;
  }

  .validation.invalid {
    color: #fca5a5;
  }

  @media (max-width: 600px) {
    .content-pools {
      grid-template-columns: 1fr;
    }
  }
</style>
