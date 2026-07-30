<script setup lang="ts">
  import { computed, ref, watchPostEffect } from 'vue'
  import { ChevronLeft, ChevronRight, LocateFixed, Users, X } from '@lucide/vue'
  import type { BoardCell, Player } from '../types/game'
  import { getBoardCellPresentation } from '../utils/boardPresentation'

  interface Props {
    cell: BoardCell | null
    totalCells: number
    players: Player[]
    visible: boolean
    mobile: boolean
  }

  interface Emits {
    (event: 'close'): void
    (event: 'previous'): void
    (event: 'next'): void
    (event: 'locate'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
  const inspectorRef = ref<HTMLDialogElement | null>(null)
  const closeButtonRef = ref<HTMLButtonElement | null>(null)

  const presentation = computed(() =>
    props.cell ? getBoardCellPresentation(props.cell, props.totalCells) : null
  )
  const occupants = computed(() =>
    props.cell ? props.players.filter(player => player.position === props.cell?.position) : []
  )
  const isFirst = computed(() => props.cell?.position === 1)
  const isLast = computed(() => props.cell?.position === props.totalCells)

  watchPostEffect(() => {
    if (!props.mobile) return
    const inspector = inspectorRef.value
    if (!props.visible || !props.cell?.position) {
      if (inspector?.open) inspector.close()
      return
    }
    if (inspector && !inspector.open) inspector.showModal()
  })

  const focusCloseButton = () => closeButtonRef.value?.focus()
</script>

<template>
  <dialog
    v-if="cell && presentation"
    ref="inspectorRef"
    class="cell-inspector"
    :class="[
      `inspector-${presentation.kind}`,
      {
        'is-visible': visible,
        'is-mobile': mobile,
      },
    ]"
    :role="mobile ? 'dialog' : 'complementary'"
    :aria-modal="mobile ? 'true' : undefined"
    :open="!mobile"
    :aria-label="`第 ${cell.position} 格详情`"
    :tabindex="mobile ? -1 : undefined"
    data-testid="cell-inspector"
    @cancel.prevent="emit('close')"
    @transitionend="focusCloseButton"
  >
    <div v-if="mobile" class="sheet-handle" aria-hidden="true"></div>

    <header class="inspector-header">
      <div>
        <span class="inspector-kicker">SPACE {{ String(cell.position).padStart(2, '0') }}</span>
        <h2>第 {{ cell.position }} 格</h2>
      </div>
      <span class="type-badge">{{ presentation.label }}</span>
      <button
        v-if="mobile"
        ref="closeButtonRef"
        type="button"
        class="icon-button close-button"
        aria-label="关闭格子详情"
        autofocus
        @click="emit('close')"
      >
        <X :size="20" />
      </button>
    </header>

    <div class="inspector-body">
      <p class="cell-description">{{ presentation.description }}</p>

      <dl v-if="presentation.details.length > 0" class="detail-grid">
        <div v-for="detail in presentation.details" :key="detail.label">
          <dt>{{ detail.label }}</dt>
          <dd>{{ detail.value }}</dd>
        </div>
      </dl>

      <div v-if="occupants.length > 0" class="occupants">
        <span class="occupants-title">
          <Users :size="15" />
          当前所在玩家
        </span>
        <div class="occupant-list">
          <span v-for="player in occupants" :key="player.id" class="occupant-chip">
            <span class="occupant-color" :style="{ backgroundColor: player.color }"></span>
            {{ player.name }}
          </span>
        </div>
      </div>
    </div>

    <footer class="inspector-actions">
      <button type="button" :disabled="isFirst" aria-label="上一格" @click="emit('previous')">
        <ChevronLeft :size="18" />
        <span>上一格</span>
      </button>
      <button type="button" class="locate-action" aria-label="在棋盘中定位" @click="emit('locate')">
        <LocateFixed :size="18" />
        <span>定位</span>
      </button>
      <button type="button" :disabled="isLast" aria-label="下一格" @click="emit('next')">
        <span>下一格</span>
        <ChevronRight :size="18" />
      </button>
    </footer>
  </dialog>
</template>

<style scoped>
  .cell-inspector {
    --inspector-accent: #94836a;
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 280px;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--inspector-accent) 58%, #d5bd8a);
    border-radius: 20px;
    color: #332d24;
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.72), transparent 34%),
      repeating-linear-gradient(
        105deg,
        rgba(98, 73, 35, 0.025) 0,
        rgba(98, 73, 35, 0.025) 1px,
        transparent 1px,
        transparent 5px
      ),
      #f5ecda;
    box-shadow:
      0 20px 54px rgba(20, 16, 11, 0.28),
      inset 0 0 0 5px rgba(255, 255, 255, 0.28);
  }

  .cell-inspector::backdrop {
    background: rgb(1 10 8 / 0.52);
    backdrop-filter: blur(3px);
  }

  .inspector-punishment {
    --inspector-accent: #b84b52;
  }

  .inspector-chain,
  .inspector-reverse {
    --inspector-accent: #b76d32;
  }

  .inspector-bonus,
  .inspector-start {
    --inspector-accent: #2f7e59;
  }

  .inspector-rest {
    --inspector-accent: #46729b;
  }

  .inspector-restart {
    --inspector-accent: #7855a0;
  }

  .inspector-trap {
    --inspector-accent: #782f38;
  }

  .inspector-finish {
    --inspector-accent: #b88934;
  }

  .inspector-header {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.65rem;
    padding: 1rem 1rem 0.85rem;
    border-bottom: 1px solid color-mix(in srgb, var(--inspector-accent) 24%, transparent);
  }

  .inspector-kicker {
    display: block;
    color: var(--inspector-accent);
    font-size: 0.58rem;
    font-weight: 850;
    letter-spacing: 0.16em;
  }

  .inspector-header h2 {
    margin: 0.18rem 0 0;
    color: #2d281f;
    font-size: 1.15rem;
    font-weight: 850;
    line-height: 1.15;
  }

  .type-badge {
    padding: 0.28rem 0.55rem;
    border: 1px solid color-mix(in srgb, var(--inspector-accent) 54%, transparent);
    border-radius: 999px;
    color: color-mix(in srgb, var(--inspector-accent) 82%, #1f1a14);
    background: color-mix(in srgb, var(--inspector-accent) 10%, #fff8ea);
    font-size: 0.68rem;
    font-weight: 800;
  }

  .icon-button {
    width: 44px;
    height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(77, 61, 38, 0.16);
    border-radius: 12px;
    color: #544b3f;
    background: rgba(255, 255, 255, 0.45);
    cursor: pointer;
  }

  .icon-button:hover {
    color: #211c16;
    background: rgba(255, 255, 255, 0.78);
  }

  .icon-button:focus-visible,
  .inspector-actions button:focus-visible {
    outline: 3px solid #2f6f5d;
    outline-offset: 2px;
  }

  .inspector-body {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .cell-description {
    margin: 0;
    color: #302a22;
    font-size: 0.95rem;
    font-weight: 720;
    line-height: 1.55;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
    margin: 0.9rem 0 0;
  }

  .detail-grid div {
    min-width: 0;
    padding: 0.6rem 0.7rem;
    border: 1px solid rgba(89, 68, 39, 0.11);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.45);
  }

  .detail-grid dt {
    color: #87765e;
    font-size: 0.62rem;
    font-weight: 720;
  }

  .detail-grid dd {
    margin: 0.14rem 0 0;
    overflow-wrap: anywhere;
    color: #332a20;
    font-size: 0.82rem;
    font-weight: 780;
  }

  .occupants {
    margin-top: 0.9rem;
    padding-top: 0.8rem;
    border-top: 1px dashed rgba(91, 67, 34, 0.18);
  }

  .occupants-title {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #675b4a;
    font-size: 0.67rem;
    font-weight: 750;
  }

  .occupant-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.45rem;
  }

  .occupant-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 30px;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    color: #3f382d;
    background: rgba(255, 255, 255, 0.52);
    font-size: 0.7rem;
    font-weight: 700;
  }

  .occupant-color {
    width: 10px;
    height: 10px;
    border: 1px solid rgba(0, 0, 0, 0.18);
    border-radius: 50%;
  }

  .inspector-actions {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.45rem;
    padding: 0.75rem;
    border-top: 1px solid rgba(81, 61, 34, 0.12);
    background: rgba(231, 217, 190, 0.48);
  }

  .inspector-actions button {
    min-width: 48px;
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.28rem;
    padding: 0 0.55rem;
    border: 1px solid rgba(76, 58, 34, 0.17);
    border-radius: 12px;
    color: #473d30;
    background: rgba(255, 255, 255, 0.5);
    font-size: 0.68rem;
    font-weight: 780;
    cursor: pointer;
  }

  .inspector-actions button:hover:not(:disabled) {
    border-color: rgba(54, 96, 77, 0.45);
    color: #173c31;
    background: rgba(255, 255, 255, 0.82);
  }

  .inspector-actions button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .inspector-actions .locate-action {
    color: #f9f1df;
    border-color: #2f6858;
    background: #285949;
  }

  .sheet-handle {
    display: none;
  }

  @media (max-width: 768px) {
    .cell-inspector.is-mobile {
      position: fixed;
      z-index: 1900;
      left: 0.5rem;
      right: 0.5rem;
      top: auto;
      bottom: max(0.5rem, env(safe-area-inset-bottom));
      max-height: min(58vh, 520px);
      min-height: 280px;
      border-radius: 22px;
      transform: translateY(calc(100% + 2rem));
      visibility: hidden;
      transition:
        transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
        visibility 220ms;
    }

    .cell-inspector.is-mobile.is-visible {
      transform: translateY(0);
      visibility: visible;
    }

    .sheet-handle {
      width: 42px;
      height: 5px;
      display: block;
      margin: 0.5rem auto -0.15rem;
      border-radius: 999px;
      background: rgba(74, 61, 42, 0.25);
    }

    .inspector-header {
      padding-top: 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cell-inspector {
      transition: none !important;
    }
  }
</style>
