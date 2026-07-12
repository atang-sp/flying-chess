<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Info, RotateCcw, Rocket, X, RotateCw } from '@lucide/vue'
  import type { PunishmentCombination } from '../types/game'
  import MiniDonut from './MiniDonut.vue'
  import type { DonutSegment } from './MiniDonut.vue'

  interface Props {
    combinations: PunishmentCombination[]
  }

  interface Emits {
    (e: 'confirm', combinations: PunishmentCombination[]): void
    (e: 'regenerate'): void
    (e: 'back-to-settings'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const removedCombinations = ref<Set<number>>(new Set())
  const selectedIndex = ref<number | null>(null)

  const TOOL_HUE = 0
  const BODY_PART_HUE = 120
  const POSITION_HUE = 240

  function hueColor(baseHue: number, index: number, total: number) {
    const hue = (baseHue + index * (360 / Math.max(total, 1))) % 360
    return `hsl(${hue}, 65%, 55%)`
  }

  function hueBg(baseHue: number, index: number, total: number) {
    const hue = (baseHue + index * (360 / Math.max(total, 1))) % 360
    return `hsla(${hue}, 65%, 55%, 0.2)`
  }

  function hueBorder(baseHue: number, index: number, total: number) {
    const hue = (baseHue + index * (360 / Math.max(total, 1))) % 360
    return `hsla(${hue}, 65%, 55%, 0.4)`
  }

  const activeCombinations = computed(() =>
    props.combinations.filter((_, i) => !removedCombinations.value.has(i))
  )

  const retainedCount = computed(() => props.combinations.length - removedCombinations.value.size)

  // --- Stats (merged from PunishmentStats) ---
  function countBy(
    list: PunishmentCombination[],
    key: (c: PunishmentCombination) => string
  ): Map<string, number> {
    const counts = new Map<string, number>()
    list.forEach(c => {
      const k = key(c)
      counts.set(k, (counts.get(k) || 0) + 1)
    })
    return counts
  }

  const uniqueToolNames = computed(() => [...new Set(props.combinations.map(c => c.tool.name))])
  const uniqueBodyPartNames = computed(() => [
    ...new Set(props.combinations.map(c => c.bodyPart.name)),
  ])
  const uniquePositionNames = computed(() => [
    ...new Set(props.combinations.map(c => c.position.name)),
  ])

  const toolDonutSegments = computed<DonutSegment[]>(() => {
    const counts = countBy(activeCombinations.value, c => c.tool.name)
    return uniqueToolNames.value.map((name, i) => ({
      name,
      value: counts.get(name) || 0,
      color: hueColor(TOOL_HUE, i, uniqueToolNames.value.length),
    }))
  })

  const bodyPartDonutSegments = computed<DonutSegment[]>(() => {
    const counts = countBy(activeCombinations.value, c => c.bodyPart.name)
    return uniqueBodyPartNames.value.map((name, i) => ({
      name,
      value: counts.get(name) || 0,
      color: hueColor(BODY_PART_HUE, i, uniqueBodyPartNames.value.length),
    }))
  })

  const positionDonutSegments = computed<DonutSegment[]>(() => {
    const counts = countBy(activeCombinations.value, c => c.position.name)
    return uniquePositionNames.value.map((name, i) => ({
      name,
      value: counts.get(name) || 0,
      color: hueColor(POSITION_HUE, i, uniquePositionNames.value.length),
    }))
  })

  // --- Chip colors ---
  function toolChipStyle(name: string) {
    const idx = uniqueToolNames.value.indexOf(name)
    const total = uniqueToolNames.value.length
    return {
      color: hueColor(TOOL_HUE, idx, total),
      backgroundColor: hueBg(TOOL_HUE, idx, total),
      borderColor: hueBorder(TOOL_HUE, idx, total),
    }
  }

  function bodyPartChipStyle(name: string) {
    const idx = uniqueBodyPartNames.value.indexOf(name)
    const total = uniqueBodyPartNames.value.length
    return {
      color: hueColor(BODY_PART_HUE, idx, total),
      backgroundColor: hueBg(BODY_PART_HUE, idx, total),
      borderColor: hueBorder(BODY_PART_HUE, idx, total),
    }
  }

  function positionChipStyle(name: string) {
    const idx = uniquePositionNames.value.indexOf(name)
    const total = uniquePositionNames.value.length
    return {
      color: hueColor(POSITION_HUE, idx, total),
      backgroundColor: hueBg(POSITION_HUE, idx, total),
      borderColor: hueBorder(POSITION_HUE, idx, total),
    }
  }

  // --- Interactions ---
  function toggleSelect(index: number) {
    selectedIndex.value = selectedIndex.value === index ? null : index
  }

  function removeCombination(index: number) {
    removedCombinations.value.add(index)
    selectedIndex.value = null
  }

  function restoreCombination(index: number) {
    removedCombinations.value.delete(index)
    selectedIndex.value = null
  }

  function confirmCombinations() {
    emit('confirm', activeCombinations.value)
  }

  function regenerateCombinations() {
    removedCombinations.value.clear()
    selectedIndex.value = null
    emit('regenerate')
  }
</script>

<template>
  <div class="punishment-confirmation glass-card">
    <!-- Step Indicator -->
    <div class="step-indicator">
      <button class="step" @click="emit('back-to-settings')">
        <span class="step-number">1</span>
        <span class="step-label">配置</span>
      </button>
      <span class="step-divider"></span>
      <div class="step active">
        <span class="step-number">2</span>
        <span class="step-label">确认</span>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="stats-summary">
      <div class="donut-group">
        <div class="donut-item">
          <MiniDonut :segments="toolDonutSegments" :size="56" :stroke-width="7" label="工具" />
          <div class="donut-legend">
            <span v-for="seg in toolDonutSegments" :key="seg.name" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: seg.color }"></span>
              {{ seg.name }}
            </span>
          </div>
        </div>
        <div class="donut-item">
          <MiniDonut :segments="bodyPartDonutSegments" :size="56" :stroke-width="7" label="部位" />
          <div class="donut-legend">
            <span v-for="seg in bodyPartDonutSegments" :key="seg.name" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: seg.color }"></span>
              {{ seg.name }}
            </span>
          </div>
        </div>
        <div class="donut-item">
          <MiniDonut :segments="positionDonutSegments" :size="56" :stroke-width="7" label="姿势" />
          <div class="donut-legend">
            <span v-for="seg in positionDonutSegments" :key="seg.name" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: seg.color }"></span>
              {{ seg.name }}
            </span>
          </div>
        </div>
      </div>
      <div class="stats-numbers">
        <div class="stat-num">
          <span class="stat-num-value">{{ combinations.length }}</span>
          <span class="stat-num-label">总数</span>
        </div>
        <div class="stat-num" v-if="removedCombinations.size > 0">
          <span class="stat-num-value stat-num-removed">{{ removedCombinations.size }}</span>
          <span class="stat-num-label">已删除</span>
        </div>
        <div class="stat-num">
          <span class="stat-num-value stat-num-retained">{{ retainedCount }}</span>
          <span class="stat-num-label">保留</span>
        </div>
      </div>
    </div>

    <p class="duplicate-notice">
      <Info :size="14" />
      相同工具+部位+姿势的组合已自动去重
    </p>

    <!-- Combination List -->
    <div class="combinations-list">
      <template v-for="(combo, index) in combinations" :key="index">
        <div
          class="combo-row"
          :class="{
            removed: removedCombinations.has(index),
            active: selectedIndex === index,
          }"
          @click="toggleSelect(index)"
        >
          <span class="combo-index">#{{ index + 1 }}</span>
          <span class="chip" :style="toolChipStyle(combo.tool.name)">
            {{ combo.tool.name }}
          </span>
          <span class="chip" :style="bodyPartChipStyle(combo.bodyPart.name)">
            {{ combo.bodyPart.name }}
          </span>
          <span class="chip" :style="positionChipStyle(combo.position.name)">
            {{ combo.position.name }}
          </span>
        </div>

        <!-- Accordion Detail -->
        <Transition name="combo-expand">
          <div v-if="selectedIndex === index" class="combo-detail">
            <div class="combo-detail-stats">
              <span class="detail-badge">强度 {{ combo.tool.intensity }}/10</span>
              <span class="detail-badge">耐受度 {{ combo.bodyPart.sensitivity }}/10</span>
            </div>
            <div class="combo-detail-desc" v-if="combo.description">
              {{ combo.description }}
            </div>
            <div class="combo-detail-footer">
              <button
                v-if="!removedCombinations.has(index)"
                class="btn-action btn-action-remove"
                @click.stop="removeCombination(index)"
              >
                <X :size="14" />
                <span>删除</span>
              </button>
              <button
                v-else
                class="btn-action btn-action-restore"
                @click.stop="restoreCombination(index)"
              >
                <RotateCw :size="14" />
                <span>恢复</span>
              </button>
            </div>
          </div>
        </Transition>
      </template>
    </div>

    <!-- Actions -->
    <div class="confirm-actions">
      <button class="btn btn-secondary" @click="regenerateCombinations">
        <RotateCcw :size="16" />
        重新生成
      </button>
      <button class="btn btn-primary" :disabled="retainedCount === 0" @click="confirmCombinations">
        <Rocket :size="16" />
        开始游戏 ({{ retainedCount }}个)
      </button>
    </div>
  </div>
</template>

<style scoped>
  .punishment-confirmation {
    margin-bottom: 1rem;
  }

  .punishment-confirmation:hover {
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Step Indicator */
  .step-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-full);
    border: var(--glass-border);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .step:hover:not(.active) {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .step.active {
    background: rgba(102, 126, 234, 0.2);
    color: var(--color-accent-light);
    border-color: rgba(102, 126, 234, 0.4);
    cursor: default;
  }

  .step-number {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.1);
  }

  .step.active .step-number {
    background: rgba(102, 126, 234, 0.4);
  }

  .step-label {
    font-weight: 600;
  }

  .step-divider {
    width: 20px;
    height: 1px;
    background: rgba(255, 255, 255, 0.15);
  }

  /* Stats Summary */
  .stats-summary {
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.8rem;
    background: var(--bg-surface);
    margin-bottom: 0.6rem;
  }

  .donut-group {
    display: flex;
    justify-content: space-around;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }

  .donut-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }

  .donut-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.2rem 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.65rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .stats-numbers {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .stat-num {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .stat-num-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-accent-light);
  }

  .stat-num-removed {
    color: var(--color-danger);
  }

  .stat-num-retained {
    color: var(--color-success);
  }

  .stat-num-label {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  /* Duplicate Notice */
  .duplicate-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--color-bonus);
    font-weight: 500;
    margin: 0 0 0.6rem 0;
    opacity: 0.9;
  }

  /* Combination List */
  .combinations-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: 45vh;
    overflow-y: auto;
    margin-bottom: 0.8rem;
    border: var(--glass-border);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
  }

  .combo-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    user-select: none;
  }

  .combo-row:last-of-type {
    border-bottom: none;
  }

  .combo-row:hover {
    background: var(--bg-glass);
  }

  .combo-row.active {
    background: var(--bg-glass-active);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .combo-row.removed {
    opacity: 0.45;
  }

  .combo-row.removed .chip {
    text-decoration: line-through;
  }

  .combo-index {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    min-width: 22px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.5rem;
    border: 1px solid;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }

  /* Accordion Detail */
  .combo-detail {
    background: var(--bg-glass);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.6rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .combo-detail-stats {
    display: flex;
    gap: 0.5rem;
  }

  .detail-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-full);
    border: var(--glass-border);
  }

  .combo-detail-desc {
    font-size: 0.8rem;
    color: var(--text-primary);
    padding: 0.35rem 0.5rem;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-accent);
  }

  .combo-detail-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .btn-action {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all var(--transition-fast);
  }

  .btn-action-remove {
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
  }

  .btn-action-remove:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  .btn-action-restore {
    border: 1px solid rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success);
  }

  .btn-action-restore:hover {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.5);
  }

  /* Transition */
  .combo-expand-enter-active,
  .combo-expand-leave-active {
    transition:
      max-height 0.25s ease,
      opacity 0.2s ease;
    overflow: hidden;
  }

  .combo-expand-enter-from,
  .combo-expand-leave-to {
    max-height: 0;
    opacity: 0;
  }

  .combo-expand-enter-to,
  .combo-expand-leave-from {
    max-height: 200px;
    opacity: 1;
  }

  /* Actions */
  .confirm-actions {
    display: flex;
    gap: 0.8rem;
  }

  .confirm-actions .btn {
    flex: 1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .donut-group {
      gap: 0.3rem;
    }

    .legend-item {
      font-size: 0.6rem;
    }

    .stats-numbers {
      gap: 1rem;
    }

    .stat-num-value {
      font-size: 1rem;
    }

    .combinations-list {
      max-height: 50vh;
    }

    .combo-row {
      padding: 0.45rem 0.5rem;
      gap: 0.3rem;
    }

    .chip {
      font-size: 0.7rem;
      padding: 0.12rem 0.4rem;
    }

    .confirm-actions {
      gap: 0.6rem;
    }
  }

  @media (max-width: 480px) {
    .step-indicator {
      gap: 0.4rem;
    }

    .step {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    .step-number {
      width: 16px;
      height: 16px;
      font-size: 0.65rem;
    }

    .donut-group {
      flex-direction: row;
      gap: 0.2rem;
    }

    .stats-summary {
      padding: 0.6rem;
    }

    .combo-row {
      padding: 0.4rem;
      gap: 0.25rem;
    }

    .combo-index {
      font-size: 0.65rem;
      min-width: 18px;
    }

    .chip {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
    }

    .combo-detail {
      padding: 0.5rem 0.6rem;
    }

    .confirm-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>
