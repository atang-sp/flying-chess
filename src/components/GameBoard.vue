<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import type { Component } from 'vue'
  import {
    Circle,
    Flame,
    Gift,
    Link,
    LocateFixed,
    MessageCircleQuestion,
    Moon,
    Rocket,
    RotateCcw,
    Skull,
    Trophy,
    Undo2,
    Zap,
  } from '@lucide/vue'
  import type { BoardCell, Player } from '../types/game'
  import PlayerMeeple from './PlayerMeeple.vue'
  import {
    getBoardCellPresentation,
    getSnakeGridPosition,
    type CellIconName,
    type CellPresentation,
    type SnakeGridPosition,
  } from '../utils/boardPresentation'
  import { vibrate } from '../utils/haptics'

  interface Props {
    board: BoardCell[]
    players: Player[]
    currentPlayerIndex: number
    selectedPosition?: number | null
    interactionDisabled?: boolean
  }

  interface Emits {
    (event: 'selectCell', cell: BoardCell): void
  }

  interface PresentedCell {
    cell: BoardCell
    presentation: CellPresentation
    grid: SnakeGridPosition
    hasNext: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    selectedPosition: null,
    interactionDisabled: false,
  })
  const emit = defineEmits<Emits>()

  const iconComponents: Record<CellIconName, Component> = {
    Circle,
    Flame,
    Gift,
    Link,
    MessageCircleQuestion,
    Moon,
    Rocket,
    RotateCcw,
    Skull,
    Trophy,
    Undo2,
    Zap,
  }

  const boardRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  const focusedPosition = ref(1)
  const activatedPosition = ref<number | null>(null)
  const landingPosition = ref<number | null>(null)
  const cellRefs = new Map<number, HTMLButtonElement>()
  let resizeObserver: ResizeObserver | null = null
  let activationTimer: ReturnType<typeof setTimeout> | null = null
  let landingTimer: ReturnType<typeof setTimeout> | null = null

  const columns = computed(() => {
    if (containerWidth.value < 600) return 5
    if (containerWidth.value < 1024) return 8
    return 10
  })

  const currentPlayer = computed(() => props.players[props.currentPlayerIndex])
  const playersByPosition = computed(() => {
    const positions = new Map<number, Array<{ player: Player; index: number }>>()
    props.players.forEach((player, index) => {
      const occupants = positions.get(player.position) ?? []
      occupants.push({ player, index })
      positions.set(player.position, occupants)
    })
    return positions
  })
  const playersAtLaunch = computed(() => playersByPosition.value.get(0) ?? [])

  const presentedCells = computed<PresentedCell[]>(() =>
    props.board.map((cell, index) => ({
      cell,
      presentation: getBoardCellPresentation(cell, props.board.length),
      grid: getSnakeGridPosition(cell.position, columns.value),
      hasNext: index < props.board.length - 1,
    }))
  )

  const gridStyle = computed(() => ({
    gridTemplateColumns: `repeat(${columns.value}, var(--board-cell-size))`,
  }))

  const getPlayersOnCell = (position: number) => playersByPosition.value.get(position) ?? []

  const getCellStyle = (grid: SnakeGridPosition) => ({
    gridRow: grid.row,
    gridColumn: grid.column,
  })

  const getCellClasses = (item: PresentedCell) => ({
    [`cell-${item.presentation.kind}`]: true,
    'cell-selected': props.selectedPosition === item.cell.position,
    'cell-occupied': getPlayersOnCell(item.cell.position).length > 0,
    'cell-activated': activatedPosition.value === item.cell.position,
    'cell-landing': landingPosition.value === item.cell.position,
    'connector-forward': item.hasNext && !item.grid.isTurn && item.grid.direction === 'forward',
    'connector-reverse': item.hasNext && !item.grid.isTurn && item.grid.direction === 'reverse',
    'connector-turn': item.hasNext && item.grid.isTurn,
  })

  const setCellRef = (position: number, element: unknown) => {
    if (element instanceof HTMLButtonElement) {
      cellRefs.set(position, element)
    } else {
      cellRefs.delete(position)
    }
  }

  const scrollToCell = (position: number, behavior: ScrollBehavior = 'smooth') => {
    const element = cellRefs.get(position)
    if (!element) return
    element.scrollIntoView({ block: 'center', inline: 'center', behavior })
  }

  const focusCell = (position: number) => {
    const bounded = Math.min(Math.max(position, 1), props.board.length)
    focusedPosition.value = bounded
    nextTick(() => {
      cellRefs.get(bounded)?.focus({ preventScroll: true })
      scrollToCell(bounded)
    })
  }

  const selectCell = (cell: BoardCell) => {
    if (props.interactionDisabled) return
    focusedPosition.value = cell.position
    emit('selectCell', cell)
  }

  const handleCellKeydown = (event: KeyboardEvent, cell: BoardCell) => {
    let nextPosition: number | null = null
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        return
      case 'ArrowRight':
      case 'ArrowDown':
        nextPosition = Math.min(cell.position + 1, props.board.length)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextPosition = Math.max(cell.position - 1, 1)
        break
      case 'Home':
        nextPosition = 1
        break
      case 'End':
        nextPosition = props.board.length
        break
      default:
        return
    }
    event.preventDefault()
    focusCell(nextPosition)
  }

  const handleCellKeyup = (event: KeyboardEvent, cell: BoardCell) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    selectCell(cell)
  }

  const locateCurrentPlayer = () => {
    const position = currentPlayer.value?.position ?? 1
    focusCell(position)
  }

  const triggerCellActivation = (position: number) => {
    activatedPosition.value = position
    vibrate(10)
    if (activationTimer) clearTimeout(activationTimer)
    activationTimer = setTimeout(() => {
      activatedPosition.value = null
    }, 1200)
  }

  const triggerLanding = (position: number) => {
    landingPosition.value = position
    if (landingTimer) clearTimeout(landingTimer)
    landingTimer = setTimeout(() => {
      landingPosition.value = null
    }, 700)
  }

  watch(
    () => props.players.map(player => player.position),
    (positions, previousPositions) => {
      if (!previousPositions) return
      const movedIndex = positions.findIndex(
        (position, index) => position !== previousPositions[index] && position > 0
      )
      if (movedIndex === -1) return
      const position = positions[movedIndex]
      nextTick(() => {
        triggerLanding(position)
        triggerCellActivation(position)
        scrollToCell(position)
      })
    }
  )

  watch(
    () => props.selectedPosition,
    position => {
      if (position == null) return
      focusedPosition.value = position
      nextTick(() => scrollToCell(position))
    }
  )

  watch(
    () => props.board.length,
    length => {
      if (length === 0) return
      focusedPosition.value = Math.min(Math.max(focusedPosition.value, 1), length)
    }
  )

  onMounted(() => {
    if (!boardRef.value) return
    containerWidth.value = boardRef.value.getBoundingClientRect().width
    resizeObserver = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) containerWidth.value = width
    })
    resizeObserver.observe(boardRef.value)
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    if (activationTimer) clearTimeout(activationTimer)
    if (landingTimer) clearTimeout(landingTimer)
  })

  defineExpose({ focusCell, scrollToCell, triggerCellActivation, triggerLanding })
</script>

<template>
  <section
    ref="boardRef"
    class="game-board"
    :class="{ 'board-disabled': interactionDisabled }"
    aria-label="飞行棋赛道"
  >
    <div class="board-toolbar">
      <div class="board-title">
        <span class="board-title-kicker">FLIGHT PATH</span>
        <strong>{{ board.length }} 格赛道</strong>
      </div>
      <button
        type="button"
        class="locate-button"
        :disabled="players.length === 0"
        aria-label="定位当前玩家"
        @click="locateCurrentPlayer"
      >
        <LocateFixed aria-hidden="true" />
        <span>定位玩家</span>
      </button>
    </div>

    <div v-if="playersAtLaunch.length > 0" class="launch-bay" aria-label="待起飞玩家">
      <span class="launch-label">
        <Rocket :size="16" />
        起飞区
      </span>
      <div class="launch-players">
        <PlayerMeeple
          v-for="{ player, index } in playersAtLaunch"
          :key="player.id"
          class="launch-token"
          :color="player.color"
          :number="index + 1"
          :name="player.name"
          size="small"
        />
      </div>
    </div>

    <div class="board-scroll">
      <div class="board-grid" :style="gridStyle" role="list">
        <button
          v-for="item in presentedCells"
          :key="item.cell.id"
          :ref="element => setCellRef(item.cell.position, element)"
          type="button"
          class="board-cell"
          :class="getCellClasses(item)"
          :style="getCellStyle(item.grid)"
          :disabled="interactionDisabled"
          :tabindex="focusedPosition === item.cell.position ? 0 : -1"
          :aria-label="`第 ${item.cell.position} 格，${item.presentation.label}`"
          :aria-pressed="selectedPosition === item.cell.position"
          :data-testid="`board-cell-${item.cell.position}`"
          :data-kind="item.presentation.kind"
          @click="selectCell(item.cell)"
          @focus="focusedPosition = item.cell.position"
          @keydown="handleCellKeydown($event, item.cell)"
          @keyup="handleCellKeyup($event, item.cell)"
        >
          <span class="track-connector" aria-hidden="true"></span>
          <span class="cell-surface">
            <span class="cell-position">{{ item.cell.position }}</span>
            <component
              :is="iconComponents[item.presentation.iconName]"
              class="cell-icon"
              :size="20"
              aria-hidden="true"
            />
            <span class="cell-label">{{ item.presentation.shortLabel }}</span>
          </span>

          <span
            v-if="getPlayersOnCell(item.cell.position).length > 0"
            class="cell-players"
            aria-hidden="true"
          >
            <PlayerMeeple
              v-for="({ player, index }, tokenIndex) in getPlayersOnCell(item.cell.position).slice(
                0,
                3
              )"
              :key="player.id"
              class="player-token"
              :class="{
                'current-player': index === currentPlayerIndex,
                'player-moving': player.isMoving,
              }"
              :style="{ '--token-index': tokenIndex }"
              :color="player.color"
              :number="index + 1"
              :name="player.name"
              size="small"
            />
            <span v-if="getPlayersOnCell(item.cell.position).length > 3" class="player-overflow">
              +{{ getPlayersOnCell(item.cell.position).length - 3 }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <p class="board-hint">
      {{
        interactionDisabled ? '棋盘由房间服务器实时同步' : '轻点格子查看完整内容 · 方向键可逐格浏览'
      }}
    </p>
  </section>
</template>

<style scoped>
  .game-board {
    --board-cell-size: clamp(48px, 12vw, 64px);
    --board-gap: 8px;
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(209, 178, 119, 0.34);
    border-radius: 24px;
    overflow: hidden;
    color: #f8f2e7;
    background:
      radial-gradient(circle at 16% 12%, rgba(255, 255, 255, 0.055), transparent 28%),
      radial-gradient(circle at 85% 78%, rgba(197, 154, 82, 0.07), transparent 35%),
      repeating-linear-gradient(
        115deg,
        rgba(255, 255, 255, 0.014) 0,
        rgba(255, 255, 255, 0.014) 1px,
        transparent 1px,
        transparent 5px
      ),
      linear-gradient(145deg, #14372f 0%, #0d2924 52%, #0a211d 100%);
    box-shadow:
      0 24px 70px rgba(1, 12, 10, 0.42),
      inset 0 0 0 6px rgba(8, 26, 23, 0.72),
      inset 0 0 0 7px rgba(209, 178, 119, 0.15);
  }

  .game-board::after {
    content: '';
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(244, 224, 184, 0.08);
    border-radius: 17px;
    pointer-events: none;
  }

  .board-disabled {
    filter: saturate(0.72);
  }

  .board-toolbar {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 54px;
    padding: 0.65rem 0.9rem 0.55rem 1rem;
    border-bottom: 1px solid rgba(238, 216, 173, 0.12);
    background: rgba(8, 29, 25, 0.62);
    backdrop-filter: blur(12px);
  }

  .board-title {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .board-title-kicker {
    color: #caa86b;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.18em;
  }

  .board-title strong {
    margin-top: 0.18rem;
    color: #fffaf0;
    font-size: 0.9rem;
    font-weight: 760;
  }

  .locate-button {
    min-width: 48px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0 0.7rem;
    border: 1px solid rgba(210, 177, 111, 0.34);
    border-radius: 999px;
    color: #f7ead0;
    background: rgba(5, 24, 20, 0.74);
    cursor: pointer;
  }

  .locate-button svg {
    width: 17px;
    height: 17px;
  }

  .locate-button span {
    font-size: 0.72rem;
    font-weight: 700;
  }

  .locate-button:hover:not(:disabled) {
    border-color: rgba(233, 194, 120, 0.78);
    background: rgba(35, 76, 63, 0.78);
  }

  .locate-button:focus-visible {
    outline: 3px solid #f2ce82;
    outline-offset: 2px;
  }

  .launch-bay {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    min-height: 44px;
    padding: 0.35rem 1rem;
    border-bottom: 1px dashed rgba(233, 203, 146, 0.16);
    background: rgba(11, 42, 35, 0.42);
  }

  .launch-label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: #dbc79f;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .launch-players {
    display: flex;
    gap: 0.25rem;
  }

  .launch-token {
    width: 26px;
    height: 26px;
  }

  .board-scroll {
    min-height: 0;
    flex: 1;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-color: rgba(211, 176, 111, 0.46) transparent;
  }

  .board-grid {
    position: relative;
    width: max-content;
    min-width: 100%;
    min-height: 100%;
    display: grid;
    grid-auto-rows: var(--board-cell-size);
    gap: var(--board-gap);
    align-content: center;
    justify-content: center;
    padding: clamp(1.2rem, 4vw, 2.4rem);
    isolation: isolate;
  }

  .board-cell {
    position: relative;
    width: var(--board-cell-size);
    height: var(--board-cell-size);
    min-width: 48px;
    min-height: 48px;
    padding: 0;
    border: 0;
    border-radius: 14px;
    color: #2d2a24;
    background: transparent;
    cursor: pointer;
    overflow: visible;
    touch-action: manipulation;
    transition:
      transform 160ms ease,
      filter 160ms ease;
  }

  .board-cell:disabled {
    cursor: default;
  }

  .cell-surface {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    grid-template:
      'position icon' 1fr
      'label label' auto / 1fr 1fr;
    align-items: center;
    padding: 0.35rem 0.4rem 0.32rem;
    border: 2px solid color-mix(in srgb, var(--cell-accent) 72%, #3f382b);
    border-radius: inherit;
    color: var(--cell-ink, #2d2a24);
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.72), transparent 38%),
      var(--cell-paper, #f4ead6);
    box-shadow:
      0 6px 0 color-mix(in srgb, var(--cell-accent) 30%, #30281e),
      0 11px 17px rgba(0, 0, 0, 0.27),
      inset 0 0 0 1px rgba(255, 255, 255, 0.56);
    overflow: hidden;
  }

  .cell-surface::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 5px;
    background: var(--cell-pattern, var(--cell-accent));
    opacity: 0.9;
  }

  .cell-position {
    grid-area: position;
    align-self: start;
    justify-self: start;
    color: color-mix(in srgb, var(--cell-ink) 72%, transparent);
    font-size: 0.58rem;
    font-weight: 850;
    font-variant-numeric: tabular-nums;
  }

  .cell-icon {
    grid-area: icon;
    align-self: start;
    justify-self: end;
    color: var(--cell-accent);
    filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.46));
  }

  .cell-label {
    grid-area: label;
    align-self: end;
    justify-self: start;
    color: var(--cell-ink);
    font-size: 0.63rem;
    font-weight: 850;
    letter-spacing: 0.02em;
  }

  .track-connector {
    position: absolute;
    z-index: 0;
    display: block;
    background: linear-gradient(90deg, #a47b3f, #d5b779, #a47b3f);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
    pointer-events: none;
  }

  .connector-forward .track-connector,
  .connector-reverse .track-connector {
    top: calc(50% + 2px);
    width: calc(var(--board-gap) + 5px);
    height: 5px;
  }

  .connector-forward .track-connector {
    left: calc(100% - 1px);
  }

  .connector-reverse .track-connector {
    right: calc(100% - 1px);
  }

  .connector-turn .track-connector {
    top: calc(100% - 1px);
    left: calc(50% - 2px);
    width: 5px;
    height: calc(var(--board-gap) + 5px);
    background: linear-gradient(180deg, #a47b3f, #d5b779, #a47b3f);
  }

  .board-cell:hover:not(:disabled) {
    z-index: 4;
    transform: translateY(-3px);
  }

  .board-cell:hover:not(:disabled) .cell-surface {
    filter: brightness(1.05);
  }

  .board-cell:focus-visible {
    z-index: 6;
    outline: 3px solid #fff8dc;
    outline-offset: 4px;
  }

  .board-cell:focus-visible .cell-surface {
    box-shadow:
      0 0 0 3px #173b32,
      0 0 0 6px #f2ce82,
      0 7px 0 color-mix(in srgb, var(--cell-accent) 30%, #30281e),
      0 14px 20px rgba(0, 0, 0, 0.34);
  }

  .cell-selected {
    z-index: 5;
    transform: translateY(-3px) scale(1.04);
  }

  .cell-selected .cell-surface {
    box-shadow:
      0 0 0 3px #12332b,
      0 0 0 6px #d7b66f,
      0 8px 0 color-mix(in srgb, var(--cell-accent) 30%, #30281e),
      0 18px 25px rgba(0, 0, 0, 0.38);
  }

  .cell-normal {
    --cell-accent: #93836a;
    --cell-paper: #eee4cf;
    --cell-ink: #3d382f;
    --cell-pattern: repeating-linear-gradient(
      90deg,
      #8d7d65 0,
      #8d7d65 4px,
      #c2b393 4px,
      #c2b393 8px
    );
  }

  .cell-start {
    --cell-accent: #2b7b69;
    --cell-paper: #e5f0df;
    --cell-ink: #183c34;
    --cell-pattern: linear-gradient(90deg, #2b7b69 0 50%, #e9d28d 50%);
  }

  .cell-finish {
    --cell-accent: #b88934;
    --cell-paper: #fff0c7;
    --cell-ink: #503b15;
    --cell-pattern: repeating-linear-gradient(
      135deg,
      #2f2b23 0,
      #2f2b23 5px,
      #f4d274 5px,
      #f4d274 10px
    );
  }

  .cell-punishment {
    --cell-accent: #b84b52;
    --cell-paper: #f4ded7;
    --cell-ink: #5c2529;
    --cell-pattern: repeating-linear-gradient(
      135deg,
      #a83e46 0,
      #a83e46 5px,
      #e8a099 5px,
      #e8a099 10px
    );
  }

  .cell-chain {
    --cell-accent: #b76d32;
    --cell-paper: #f4e1ca;
    --cell-ink: #5b321c;
    --cell-pattern: repeating-radial-gradient(circle, #a9602d 0 2px, #d89b5d 2px 5px);
  }

  .cell-bonus {
    --cell-accent: #2f7e59;
    --cell-paper: #dfeedb;
    --cell-ink: #1e4937;
    --cell-pattern: linear-gradient(90deg, #2f7e59, #84b46d, #2f7e59);
  }

  .cell-reverse {
    --cell-accent: #a86430;
    --cell-paper: #f3dfc9;
    --cell-ink: #56351e;
    --cell-pattern: repeating-linear-gradient(
      -45deg,
      #9a5929 0,
      #9a5929 4px,
      #d89d61 4px,
      #d89d61 8px
    );
  }

  .cell-rest {
    --cell-accent: #46729b;
    --cell-paper: #dfe8ee;
    --cell-ink: #243e56;
    --cell-pattern: repeating-linear-gradient(
      90deg,
      #416b91 0,
      #416b91 7px,
      #8eb0c5 7px,
      #8eb0c5 9px
    );
  }

  .cell-restart {
    --cell-accent: #7855a0;
    --cell-paper: #e8dfee;
    --cell-ink: #432e59;
    --cell-pattern:
      radial-gradient(circle at 25% 50%, #6e4b94 0 3px, transparent 4px),
      radial-gradient(circle at 75% 50%, #6e4b94 0 3px, transparent 4px), #b89bcb;
  }

  .cell-trap {
    --cell-accent: #782f38;
    --cell-paper: #e5d9d4;
    --cell-ink: #431b20;
    --cell-pattern: repeating-linear-gradient(
      135deg,
      #302a25 0,
      #302a25 5px,
      #a54149 5px,
      #a54149 10px
    );
  }

  .cell-qa {
    --cell-accent: #3b82f6;
    --cell-paper: #dce8f8;
    --cell-ink: #1e3a5f;
    --cell-pattern: repeating-linear-gradient(
      90deg,
      #3b6fb5 0,
      #3b6fb5 6px,
      #8fb4e0 6px,
      #8fb4e0 8px
    );
  }

  .cell-dare {
    --cell-accent: #f59e0b;
    --cell-paper: #f8ecd4;
    --cell-ink: #5c3d0e;
    --cell-pattern: repeating-linear-gradient(
      135deg,
      #d97706 0,
      #d97706 5px,
      #fbbf24 5px,
      #fbbf24 10px
    );
  }

  .cell-start,
  .cell-finish {
    transform: scale(1.06);
  }

  .cell-players {
    position: absolute;
    z-index: 8;
    top: -8px;
    left: 50%;
    width: 100%;
    height: 28px;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .player-token {
    position: absolute;
    left: calc(50% + (var(--token-index) - 1) * 15px);
    width: 26px;
    height: 28px;
    transform: translateX(-50%);
  }

  .player-token.current-player {
    filter: drop-shadow(0 0 2px #3e2d14) drop-shadow(0 0 5px #f4cf7e)
      drop-shadow(0 4px 4px rgb(0 0 0 / 0.52));
  }

  .player-overflow {
    position: absolute;
    right: -6px;
    top: -8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 23px;
    height: 23px;
    padding: 0 0.25rem;
    border: 2px solid #f2e3c2;
    border-radius: 999px;
    color: #fffaf0;
    background: #29251f;
    font-size: 0.58rem;
    font-weight: 800;
  }

  .cell-landing .cell-surface {
    animation: tileLand 650ms cubic-bezier(0.2, 0.9, 0.24, 1.4);
  }

  .cell-activated .cell-surface {
    animation: tileGlow 500ms ease-out 2;
  }

  @keyframes tileLand {
    0% {
      transform: scale(1);
    }
    45% {
      transform: scale(1.17) rotate(-1.5deg);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes tileGlow {
    50% {
      filter: brightness(1.18);
      box-shadow:
        0 0 0 5px rgba(255, 224, 153, 0.62),
        0 14px 25px rgba(0, 0, 0, 0.38);
    }
  }

  .board-hint {
    position: relative;
    z-index: 2;
    margin: 0;
    padding: 0.45rem 0.75rem 0.55rem;
    color: rgba(244, 231, 202, 0.62);
    border-top: 1px solid rgba(238, 216, 173, 0.1);
    background: rgba(7, 25, 22, 0.58);
    font-size: 0.64rem;
    text-align: center;
  }

  @media (max-width: 599px) {
    .game-board {
      border-radius: 18px;
    }

    .board-toolbar {
      min-height: 48px;
      padding: 0.45rem 0.65rem 0.42rem 0.75rem;
    }

    .locate-button {
      width: 44px;
      min-width: 44px;
      height: 40px;
      min-height: 40px;
      padding: 0;
    }

    .locate-button span {
      display: none;
    }

    .launch-bay {
      min-height: 38px;
      padding: 0.25rem 0.65rem;
    }

    .board-grid {
      align-content: start;
      min-height: max-content;
      padding: 1.35rem 0.9rem 1.6rem;
    }

    .board-hint {
      display: none;
    }
  }

  @media (min-width: 1024px) {
    .game-board {
      --board-gap: 10px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .board-cell,
    .cell-surface,
    .player-token {
      transition: none !important;
      animation: none !important;
    }
  }
</style>
