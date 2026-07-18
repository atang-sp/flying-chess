<script setup lang="ts">
  import { ref, computed, type Component } from 'vue'
  import { Plus, Equal, X, Minus } from '@lucide/vue'

  export interface RatioItem {
    name: string
    ratio: number
    [key: string]: any
  }

  interface Props {
    items: RatioItem[]
    title: string
    icon?: Component
    hueOffset?: number
  }

  interface Emits {
    (e: 'update:ratio', index: number, value: number): void
    (e: 'remove', name: string): void
    (e: 'equal-distribute'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    hueOffset: 0,
  })

  const emit = defineEmits<Emits>()

  const selectedName = ref<string | null>(null)
  const showAddForm = ref(false)

  const selectedIndex = computed(() => {
    if (!selectedName.value) return -1
    return props.items.findIndex(i => i.name === selectedName.value)
  })

  const selectedItem = computed(() => {
    if (selectedIndex.value < 0) return null
    return props.items[selectedIndex.value]
  })

  function getSegmentColor(index: number, active: boolean) {
    const hue = (props.hueOffset + index * (360 / Math.max(props.items.length, 1))) % 360
    const lightness = active ? 70 : 55
    return `hsl(${hue}, 65%, ${lightness}%)`
  }

  function getSegmentBg(index: number, active: boolean) {
    const hue = (props.hueOffset + index * (360 / Math.max(props.items.length, 1))) % 360
    const alpha = active ? 0.35 : 0.2
    return `hsla(${hue}, 65%, 55%, ${alpha})`
  }

  function select(item: RatioItem) {
    if (selectedName.value === item.name) {
      selectedName.value = null
    } else {
      selectedName.value = item.name
      showAddForm.value = false
    }
  }

  function toggleAddForm() {
    showAddForm.value = !showAddForm.value
    if (showAddForm.value) {
      selectedName.value = null
    }
  }

  function closeAddForm() {
    showAddForm.value = false
  }

  function onRatioSliderInput(value: number) {
    if (selectedIndex.value >= 0) {
      emit('update:ratio', selectedIndex.value, Math.round(value / 5) * 5)
    }
  }

  function removeSelected() {
    if (selectedName.value) {
      const name = selectedName.value
      selectedName.value = null
      emit('remove', name)
    }
  }

  defineExpose({ closeAddForm })
</script>

<template>
  <div class="ratio-distributor">
    <!-- Header -->
    <div class="rd-header">
      <div class="rd-title">
        <component :is="icon" v-if="icon" :size="18" />
        <h4>{{ title }}</h4>
        <span class="rd-badge">{{ items.length }}</span>
      </div>
      <div class="rd-actions">
        <button class="rd-btn-action" title="均匀分配" @click="emit('equal-distribute')">
          <Equal :size="14" />
        </button>
        <button
          class="rd-btn-action rd-btn-add"
          :class="{ active: showAddForm }"
          title="添加"
          @click="toggleAddForm"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>

    <!-- Stacked Bar (PC) -->
    <div v-if="items.length > 0" class="rd-bar">
      <div
        v-for="(item, idx) in items"
        :key="item.name"
        class="rd-segment"
        :class="{ active: selectedName === item.name }"
        :style="{
          flexBasis: item.ratio + '%',
          backgroundColor: getSegmentBg(idx, selectedName === item.name),
          borderColor: getSegmentColor(idx, selectedName === item.name),
        }"
        @click="select(item)"
      >
        <span class="segment-label">{{ item.name }}</span>
        <span class="segment-value">{{ Math.round(item.ratio) }}%</span>
      </div>
    </div>

    <!-- Mobile List -->
    <div v-if="items.length > 0" class="rd-list">
      <div
        v-for="(item, idx) in items"
        :key="item.name"
        class="rd-list-item"
        :class="{ active: selectedName === item.name }"
        @click="select(item)"
      >
        <div class="rd-list-item-info">
          <span
            class="rd-list-dot"
            :style="{ backgroundColor: getSegmentColor(idx, selectedName === item.name) }"
          ></span>
          <span class="rd-list-name">{{ item.name }}</span>
          <span class="rd-list-ratio">{{ Math.round(item.ratio) }}%</span>
        </div>
        <div class="rd-list-bar-track">
          <div
            class="rd-list-bar-fill"
            :style="{
              width: item.ratio + '%',
              backgroundColor: getSegmentColor(idx, selectedName === item.name),
            }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="items.length === 0" class="rd-empty">
      <span>暂无条目，点击 + 添加</span>
    </div>

    <!-- Inline Detail Panel (Accordion) -->
    <Transition name="rd-expand">
      <div v-if="selectedItem" :key="selectedName!" class="rd-detail">
        <div class="rd-detail-row">
          <span class="rd-detail-label">比例</span>
          <div class="rd-detail-slider-group">
            <button
              class="btn-stat"
              :disabled="selectedItem.ratio <= 0"
              @click="onRatioSliderInput(selectedItem.ratio - 5)"
            >
              <Minus :size="14" />
            </button>
            <input
              type="range"
              :value="selectedItem.ratio"
              :min="0"
              :max="100"
              step="5"
              class="rd-slider"
              @input="onRatioSliderInput(Number(($event.target as HTMLInputElement).value))"
            />
            <span class="rd-detail-value">{{ Math.round(selectedItem.ratio) }}%</span>
            <button
              class="btn-stat"
              :disabled="selectedItem.ratio >= 100"
              @click="onRatioSliderInput(selectedItem.ratio + 5)"
            >
              <Plus :size="14" />
            </button>
          </div>
        </div>

        <slot name="detail" :item="selectedItem" :index="selectedIndex" />

        <div class="rd-detail-footer">
          <button class="rd-btn-remove" @click="removeSelected">
            <X :size="14" />
            <span>删除</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Add Form -->
    <Transition name="rd-expand">
      <div v-if="showAddForm" class="rd-add-form">
        <slot name="add-form" :close="closeAddForm" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .ratio-distributor {
    border: var(--glass-border);
    border-radius: var(--radius-md);
    padding: 0.8rem;
    background: var(--bg-surface);
  }

  /* Header */
  .rd-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
  }

  .rd-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .rd-title h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .rd-badge {
    font-size: 0.7rem;
    color: var(--text-secondary);
    background: var(--bg-glass);
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-full);
    border: var(--glass-border);
    margin-left: 0.2rem;
  }

  .rd-actions {
    display: flex;
    gap: 0.3rem;
  }

  .rd-btn-action {
    width: 28px;
    height: 28px;
    border: var(--glass-border);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .rd-btn-action:hover {
    background: var(--bg-glass-hover);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .rd-btn-action.active,
  .rd-btn-add.active {
    background: rgba(102, 126, 234, 0.25);
    color: var(--color-accent-light);
    border-color: rgba(102, 126, 234, 0.4);
  }

  /* Stacked Bar - visible on PC */
  .rd-bar {
    display: flex;
    height: 40px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    gap: 2px;
    margin-bottom: 0.4rem;
  }

  .rd-segment {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      flex-basis 0.3s ease,
      background-color 0.2s ease,
      transform 0.15s ease;
    border: 1px solid transparent;
    border-radius: 4px;
    min-width: 0;
    overflow: hidden;
    padding: 0 4px;
    user-select: none;
  }

  .rd-segment:hover {
    transform: scaleY(1.05);
  }

  .rd-segment.active {
    transform: scaleY(1.1);
    border-width: 1.5px;
    z-index: 1;
  }

  .segment-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.2;
  }

  .segment-value {
    font-size: 0.6rem;
    color: var(--text-secondary);
    line-height: 1.2;
  }

  /* Hide text on very small segments */
  .rd-segment[style*='flex-basis: 0%'] .segment-label,
  .rd-segment[style*='flex-basis: 5%'] .segment-label {
    display: none;
  }

  /* Mobile List - hidden on PC */
  .rd-list {
    display: none;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.4rem;
  }

  .rd-list-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 0.15s ease;
    border: 1px solid transparent;
  }

  .rd-list-item:hover {
    background: var(--bg-glass);
  }

  .rd-list-item.active {
    background: var(--bg-glass-active);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .rd-list-item-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .rd-list-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .rd-list-name {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .rd-list-ratio {
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .rd-list-bar-track {
    height: 3px;
    background: var(--bg-secondary);
    border-radius: 2px;
    overflow: hidden;
    margin-left: 1.2rem;
  }

  .rd-list-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* Empty state */
  .rd-empty {
    text-align: center;
    padding: 1rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  /* Detail panel */
  .rd-detail {
    background: var(--bg-glass);
    border: var(--glass-border);
    border-radius: var(--radius-sm);
    padding: 0.7rem;
    margin-top: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .rd-detail-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rd-detail-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    min-width: 36px;
  }

  .rd-detail-slider-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
  }

  .rd-slider {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--bg-secondary);
    outline: none;
    -webkit-appearance: none;
  }

  .rd-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    box-shadow: 0 0 6px rgba(102, 126, 234, 0.4);
  }

  .rd-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 6px rgba(102, 126, 234, 0.4);
  }

  .rd-detail-value {
    min-width: 32px;
    text-align: center;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .btn-stat {
    width: 24px;
    height: 24px;
    border: var(--glass-border);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .btn-stat:hover:not(:disabled) {
    background: var(--bg-glass-hover);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-stat:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .rd-detail-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .rd-btn-remove {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-danger);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.75rem;
    transition: all var(--transition-fast);
  }

  .rd-btn-remove:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  /* Add form */
  .rd-add-form {
    background: var(--bg-glass);
    border: 1px solid rgba(102, 126, 234, 0.25);
    border-radius: var(--radius-sm);
    padding: 0.7rem;
    margin-top: 0.4rem;
  }

  /* Transition */
  .rd-expand-enter-active,
  .rd-expand-leave-active {
    transition:
      max-height 0.25s ease,
      opacity 0.2s ease,
      margin-top 0.25s ease;
    overflow: hidden;
  }

  .rd-expand-enter-from,
  .rd-expand-leave-to {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
  }

  .rd-expand-enter-to,
  .rd-expand-leave-from {
    max-height: 300px;
    opacity: 1;
  }

  /* Responsive: mobile */
  @media (max-width: 768px) {
    .rd-bar {
      display: none;
    }

    .rd-list {
      display: flex;
    }

    .rd-title h4 {
      font-size: 0.95rem;
    }

    .rd-detail {
      padding: 0.6rem;
    }

    .rd-slider::-webkit-slider-thumb {
      width: 20px;
      height: 20px;
    }

    .rd-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
    }
  }

  @media (max-width: 480px) {
    .ratio-distributor {
      padding: 0.6rem;
    }

    .rd-title h4 {
      font-size: 0.9rem;
    }

    .rd-btn-action {
      width: 26px;
      height: 26px;
    }

    .rd-detail {
      padding: 0.5rem;
      gap: 0.4rem;
    }

    .btn-stat {
      width: 22px;
      height: 22px;
    }
  }
</style>
