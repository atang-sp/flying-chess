<script setup lang="ts">
  import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import type { BoardCell, Player } from '../types/game'
  import { CELL_ICON_NAMES } from '../config/gameConfig'
  import { Zap, Gift, Undo2, Moon, RotateCcw, Skull, Rocket, Sparkles, Link } from '@lucide/vue'
  import CoolDice from './CoolDice.vue'

  interface Props {
    board: BoardCell[]
    players: Player[]
    currentPlayerIndex: number
    lastEffect?: string
    canRoll?: boolean
    diceValue?: number | null
    turnCount?: number
  }

  interface Emits {
    (e: 'cellClick', cell: BoardCell): void
    (e: 'roll'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const iconComponents: Record<string, any> = {
    Zap,
    Gift,
    Undo2,
    Moon,
    RotateCcw,
    Skull,
    Rocket,
    Sparkles,
    Link,
  }

  const tooltipVisible = ref(false)
  const tooltipCell = ref<BoardCell | null>(null)
  const tooltipStyle = ref({ left: '0px', top: '0px' })

  const activatedCell = ref<number | null>(null)
  const landingCell = ref<number | null>(null)

  const boardRingRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(800)
  const containerHeight = ref(600)
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (boardRingRef.value) {
      const rect = boardRingRef.value.getBoundingClientRect()
      containerWidth.value = rect.width || 800
      containerHeight.value = rect.height || 600
    }
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
      }
    })
    if (boardRingRef.value) {
      resizeObserver.observe(boardRingRef.value)
    }
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  const isMobile = computed(() => containerWidth.value < 600)

  const layoutRatio = computed(() => {
    const isPortrait = containerHeight.value > containerWidth.value
    return isPortrait ? 1.0 : 1.6
  })

  const ringLayout = computed(() => {
    const totalCells = props.board.length
    if (totalCells === 0) return { top: [], right: [], bottom: [], left: [] }

    const ratio = layoutRatio.value
    const adjustedHorizontal = Math.ceil((totalCells * ratio) / (2 * (1 + ratio)))
    const adjustedVertical = Math.ceil((totalCells - 2 * adjustedHorizontal) / 2)

    const topCount = adjustedHorizontal
    const rightCount = adjustedVertical
    const bottomCount = Math.min(adjustedHorizontal, totalCells - topCount - rightCount)
    const leftCount = totalCells - topCount - rightCount - bottomCount

    let idx = 0
    const top: number[] = []
    const right: number[] = []
    const bottom: number[] = []
    const left: number[] = []

    for (let i = 0; i < topCount && idx < totalCells; i++) top.push(props.board[idx++].position)
    for (let i = 0; i < rightCount && idx < totalCells; i++) right.push(props.board[idx++].position)
    for (let i = 0; i < bottomCount && idx < totalCells; i++)
      bottom.push(props.board[idx++].position)
    for (let i = 0; i < leftCount && idx < totalCells; i++) left.push(props.board[idx++].position)

    return { top, right, bottom: bottom.reverse(), left: left.reverse() }
  })

  const getCellByPosition = (position: number): BoardCell => {
    const foundCell = props.board.find(cell => cell.position === position)
    if (foundCell) return foundCell
    return {
      id: position,
      type: 'bonus',
      position,
      effect: { type: 'move', value: 0, description: '安全格子' },
    }
  }

  const getCellClass = (position: number): string => {
    const cell = getCellByPosition(position)
    const classes = [`cell-${cell.type}`]
    if (props.players.some(p => p.position === position)) classes.push('cell-occupied')
    if (activatedCell.value === position) classes.push('cell-activated')
    if (landingCell.value === position) classes.push('cell-landing')
    if (position === 1) classes.push('cell-start')
    return classes.join(' ')
  }

  const getCellIconComponent = (position: number): string | null => {
    const cell = getCellByPosition(position)
    if (cell.effect?.type === 'rest') return 'Moon'
    if (cell.effect?.type === 'reverse') return 'Undo2'
    return CELL_ICON_NAMES[cell.type] || null
  }

  const getCellIcon = (position: number) => {
    const name = getCellIconComponent(position)
    return name ? iconComponents[name] : null
  }

  const getCellTypeName = (type: string): string => {
    const typeNames: Record<string, string> = {
      punishment: '惩罚格',
      bonus: '奖励格',
      special: '特殊格',
      restart: '回起点',
      trap: '陷阱格',
      chain_punishment: '连锁惩罚',
    }
    return typeNames[type] || '普通格'
  }

  const getPlayersOnCell = (position: number): Player[] => {
    return props.players.filter(p => p.position === position)
  }

  const cellSize = computed(() => {
    const { top, bottom } = ringLayout.value
    const maxHorizontalCells = Math.max(top.length, bottom.length, 1)
    const gap = 4
    const edgePadding = 4
    const availableWidth = containerWidth.value - edgePadding - (maxHorizontalCells - 1) * gap
    const idealSize = Math.floor(availableWidth / maxHorizontalCells)
    return Math.max(24, Math.min(idealSize, 56))
  })

  const cellIconSize = computed(() => Math.max(10, Math.round(cellSize.value * 0.38)))

  const cellBorderRadius = computed(() => Math.max(6, Math.round(cellSize.value * 0.2)))

  const markerSize = computed(() => Math.max(14, Math.min(Math.round(cellSize.value * 0.4), 24)))

  const boardAspect = computed(() => {
    const r = containerWidth.value / Math.max(containerHeight.value, 1)
    if (r >= 1.6) return 1.8
    if (r >= 1.0) return 0.4 * r + 1.16
    return 1.0
  })

  const diceScale = computed(() => {
    const s = cellSize.value
    if (s >= 50) return 1
    if (s >= 40) return 0.75
    if (s >= 32) return 0.6
    return 0.5
  })

  const boardCssVars = computed(() => ({
    '--cell-size': `${cellSize.value}px`,
    '--cell-icon-size': `${cellIconSize.value}px`,
    '--cell-border-radius': `${cellBorderRadius.value}px`,
    '--marker-size': `${markerSize.value}px`,
    '--marker-offset': `${-markerSize.value / 2}px`,
    '--board-aspect': `${boardAspect.value} / 1`,
    '--dice-scale': `${diceScale.value}`,
    '--edge-gap': `${cellSize.value >= 44 ? 4 : cellSize.value >= 36 ? 3 : 2}px`,
  }))

  const getPlayerOffset = (playerIndex: number, totalOnCell: number): { x: number; y: number } => {
    if (totalOnCell === 1) return { x: 0, y: 0 }
    const angle = ((2 * Math.PI) / totalOnCell) * playerIndex - Math.PI / 2
    const radius = Math.max(8, cellSize.value * 0.25)
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  }

  const handleCellClick = (cell: BoardCell) => {
    emit('cellClick', cell)
  }

  const handleDiceRoll = () => {
    emit('roll')
    vibrate(15)
  }

  const vibrate = (ms: number) => {
    try {
      navigator?.vibrate?.(ms)
    } catch {
      // vibration not supported
    }
  }

  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  const isTouchDevice = ref(false)

  const handleTouchStart = (cell: BoardCell, event: TouchEvent) => {
    isTouchDevice.value = true
    longPressTimer = setTimeout(() => {
      showTooltipForCell(cell, event.touches[0].clientX, event.touches[0].clientY)
      vibrate(10)
    }, 300)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    setTimeout(hideTooltip, 200)
  }

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const showTooltipForCell = (cell: BoardCell, clientX: number, clientY: number) => {
    tooltipCell.value = cell
    tooltipVisible.value = true

    if (isMobile.value) {
      tooltipStyle.value = { left: '0px', top: '0px' }
      return
    }

    const tooltipWidth = 220
    const tooltipHeight = 120
    let left = clientX - tooltipWidth / 2
    let top = clientY - tooltipHeight - 16

    if (left < 8) left = 8
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8
    if (top < 8) top = clientY + 16

    tooltipStyle.value = { left: `${left}px`, top: `${top}px` }
  }

  const showTooltip = (cell: BoardCell, event: MouseEvent | TouchEvent) => {
    if (isTouchDevice.value) return
    tooltipCell.value = cell
    tooltipVisible.value = true

    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const tooltipWidth = 220
    const tooltipHeight = 120

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    let top = rect.top - tooltipHeight - 8

    if (left < 8) left = 8
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8
    if (top < 8) top = rect.bottom + 8

    tooltipStyle.value = { left: `${left}px`, top: `${top}px` }
  }

  const hideTooltip = () => {
    tooltipVisible.value = false
    tooltipCell.value = null
  }

  const handleBoardClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.board-cell')) return
    hideTooltip()
  }

  const triggerCellActivation = (position: number) => {
    activatedCell.value = position
    vibrate(10)
    setTimeout(() => {
      activatedCell.value = null
    }, 1500)
  }

  const triggerLanding = (position: number) => {
    landingCell.value = position
    setTimeout(() => {
      landingCell.value = null
    }, 800)
  }

  watch(
    () => props.players.map(p => p.position),
    (newPositions, oldPositions) => {
      if (!oldPositions) return
      for (let i = 0; i < newPositions.length; i++) {
        if (newPositions[i] !== oldPositions[i]) {
          nextTick(() => {
            triggerLanding(newPositions[i])
            triggerCellActivation(newPositions[i])
          })
        }
      }
    }
  )

  const currentPlayer = computed(() => props.players[props.currentPlayerIndex])
  const playersAtStart = computed(() => props.players.filter(p => p.position === 0))
</script>

<template>
  <div class="game-board" @click="handleBoardClick">
    <div ref="boardRingRef" class="board-ring" :style="boardCssVars">
      <!-- Top edge -->
      <div class="ring-edge ring-top">
        <div
          v-for="pos in ringLayout.top"
          :key="'t-' + pos"
          class="board-cell"
          :class="getCellClass(pos)"
          @click="handleCellClick(getCellByPosition(pos))"
          @mouseenter="showTooltip(getCellByPosition(pos), $event)"
          @mouseleave="hideTooltip"
          @touchstart.passive="handleTouchStart(getCellByPosition(pos), $event)"
          @touchend.passive="handleTouchEnd()"
          @touchmove.passive="handleTouchMove()"
        >
          <div class="cell-glow"></div>
          <div class="cell-icon">
            <component :is="getCellIcon(pos)" v-if="getCellIcon(pos)" :size="cellIconSize" />
          </div>
          <span class="cell-number">{{ pos }}</span>
          <div class="cell-players">
            <div
              v-for="(player, pIdx) in getPlayersOnCell(pos)"
              :key="'p-' + player.id"
              class="player-marker"
              :class="{
                'current-player': player.id === currentPlayer?.id,
                'player-moving': player.isMoving,
              }"
              :style="{
                backgroundColor: player.color,
                transform: `translate(${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).x}px, ${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).y}px)`,
              }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right edge -->
      <div class="ring-edge ring-right">
        <div
          v-for="pos in ringLayout.right"
          :key="'r-' + pos"
          class="board-cell"
          :class="getCellClass(pos)"
          @click="handleCellClick(getCellByPosition(pos))"
          @mouseenter="showTooltip(getCellByPosition(pos), $event)"
          @mouseleave="hideTooltip"
          @touchstart.passive="handleTouchStart(getCellByPosition(pos), $event)"
          @touchend.passive="handleTouchEnd()"
          @touchmove.passive="handleTouchMove()"
        >
          <div class="cell-glow"></div>
          <div class="cell-icon">
            <component :is="getCellIcon(pos)" v-if="getCellIcon(pos)" :size="cellIconSize" />
          </div>
          <span class="cell-number">{{ pos }}</span>
          <div class="cell-players">
            <div
              v-for="(player, pIdx) in getPlayersOnCell(pos)"
              :key="'p-' + player.id"
              class="player-marker"
              :class="{
                'current-player': player.id === currentPlayer?.id,
                'player-moving': player.isMoving,
              }"
              :style="{
                backgroundColor: player.color,
                transform: `translate(${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).x}px, ${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).y}px)`,
              }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Center area -->
      <div class="ring-center">
        <div class="center-dice">
          <CoolDice
            :can-roll="canRoll ?? false"
            :value="diceValue ?? null"
            @roll="handleDiceRoll"
          />
        </div>
        <div v-if="currentPlayer && !isMobile" class="center-status">
          <div class="status-player">
            <span class="status-avatar" :style="{ backgroundColor: currentPlayer.color }">
              {{ currentPlayer.name.charAt(0) }}
            </span>
            <span class="status-name">{{ currentPlayer.name }}</span>
            <span v-if="turnCount" class="status-turn">R{{ turnCount }}</span>
          </div>
          <div class="status-position">
            {{ currentPlayer.position === 0 ? '等待起飞' : `第 ${currentPlayer.position} 格` }}
          </div>
        </div>
        <div v-if="playersAtStart.length > 0" class="start-zone">
          <Rocket :size="14" class="start-zone-icon" />
          <div class="start-zone-players">
            <div
              v-for="player in playersAtStart"
              :key="'start-' + player.id"
              class="player-marker start-marker"
              :class="{ 'current-player': player.id === currentPlayer?.id }"
              :style="{ backgroundColor: player.color }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
        <div v-if="lastEffect && !isMobile" class="center-effect">
          <Sparkles :size="14" />
          <span>{{ lastEffect }}</span>
        </div>
      </div>

      <!-- Bottom edge -->
      <div class="ring-edge ring-bottom">
        <div
          v-for="pos in ringLayout.bottom"
          :key="'b-' + pos"
          class="board-cell"
          :class="getCellClass(pos)"
          @click="handleCellClick(getCellByPosition(pos))"
          @mouseenter="showTooltip(getCellByPosition(pos), $event)"
          @mouseleave="hideTooltip"
          @touchstart.passive="handleTouchStart(getCellByPosition(pos), $event)"
          @touchend.passive="handleTouchEnd()"
          @touchmove.passive="handleTouchMove()"
        >
          <div class="cell-glow"></div>
          <div class="cell-icon">
            <component :is="getCellIcon(pos)" v-if="getCellIcon(pos)" :size="cellIconSize" />
          </div>
          <span class="cell-number">{{ pos }}</span>
          <div class="cell-players">
            <div
              v-for="(player, pIdx) in getPlayersOnCell(pos)"
              :key="'p-' + player.id"
              class="player-marker"
              :class="{
                'current-player': player.id === currentPlayer?.id,
                'player-moving': player.isMoving,
              }"
              :style="{
                backgroundColor: player.color,
                transform: `translate(${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).x}px, ${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).y}px)`,
              }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Left edge -->
      <div class="ring-edge ring-left">
        <div
          v-for="pos in ringLayout.left"
          :key="'l-' + pos"
          class="board-cell"
          :class="getCellClass(pos)"
          @click="handleCellClick(getCellByPosition(pos))"
          @mouseenter="showTooltip(getCellByPosition(pos), $event)"
          @mouseleave="hideTooltip"
          @touchstart.passive="handleTouchStart(getCellByPosition(pos), $event)"
          @touchend.passive="handleTouchEnd()"
          @touchmove.passive="handleTouchMove()"
        >
          <div class="cell-glow"></div>
          <div class="cell-icon">
            <component :is="getCellIcon(pos)" v-if="getCellIcon(pos)" :size="cellIconSize" />
          </div>
          <span class="cell-number">{{ pos }}</span>
          <div class="cell-players">
            <div
              v-for="(player, pIdx) in getPlayersOnCell(pos)"
              :key="'p-' + player.id"
              class="player-marker"
              :class="{
                'current-player': player.id === currentPlayer?.id,
                'player-moving': player.isMoving,
              }"
              :style="{
                backgroundColor: player.color,
                transform: `translate(${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).x}px, ${getPlayerOffset(pIdx, getPlayersOnCell(pos).length).y}px)`,
              }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Corner connectors for visual flow -->
      <div class="corner corner-tr"></div>
      <div class="corner corner-br"></div>
      <div class="corner corner-bl"></div>
      <div class="corner corner-tl"></div>
    </div>

    <!-- Desktop tooltip (follows cursor) -->
    <Teleport to="body">
      <div
        v-if="tooltipVisible && tooltipCell && !isMobile"
        class="cell-tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-header">
          <span class="tooltip-number">#{{ tooltipCell.position }}</span>
          <span class="tooltip-type" :class="'type-' + tooltipCell.type">
            {{ getCellTypeName(tooltipCell.type) }}
          </span>
        </div>
        <div class="tooltip-body">
          <template v-if="tooltipCell.effect">
            <div class="tooltip-desc">{{ tooltipCell.effect.description }}</div>
            <div
              v-if="tooltipCell.effect.type === 'punishment' && tooltipCell.effect.punishment"
              class="tooltip-details"
            >
              <span>{{ tooltipCell.effect.punishment.tool.name }}</span>
              <span>{{ tooltipCell.effect.punishment.bodyPart.name }}</span>
              <span>{{ tooltipCell.effect.punishment.position.name }}</span>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'move'" class="tooltip-details">
              <span>
                移动 {{ tooltipCell.effect.value > 0 ? '+' : '' }}{{ tooltipCell.effect.value }} 步
              </span>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'rest'" class="tooltip-details">
              <span>休息 {{ tooltipCell.effect.value }} 回合</span>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'reverse'" class="tooltip-details">
              <span>后退 {{ tooltipCell.effect.value }} 步</span>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'restart'" class="tooltip-details">
              <span>回到起点</span>
            </div>
            <div v-else-if="tooltipCell.effect.type === 'trap'" class="tooltip-details">
              <span>随机惩罚</span>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Mobile tooltip (bottom bar) -->
    <Transition name="mobile-tooltip">
      <div v-if="tooltipVisible && tooltipCell && isMobile" class="mobile-tooltip-bar">
        <span class="tooltip-number">#{{ tooltipCell.position }}</span>
        <span class="tooltip-type" :class="'type-' + tooltipCell.type">
          {{ getCellTypeName(tooltipCell.type) }}
        </span>
        <span v-if="tooltipCell.effect" class="tooltip-desc-inline">
          {{ tooltipCell.effect.description }}
        </span>
      </div>
    </Transition>

    <!-- Full-screen effect flash -->
    <Transition name="flash">
      <div
        v-if="activatedCell !== null"
        class="effect-flash"
        :class="'flash-' + getCellByPosition(activatedCell).type"
      ></div>
    </Transition>
  </div>
</template>

<style scoped>
  .game-board {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    position: relative;
  }

  /* === Ring Layout (CSS-var driven) === */
  .board-ring {
    display: grid;
    grid-template-areas:
      '.    top    .'
      'left center right'
      '.    bottom .';
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto 1fr auto;
    gap: 0;
    width: 100%;
    max-width: 1100px;
    aspect-ratio: var(--board-aspect, 1.4 / 1);
    position: relative;
  }

  .ring-edge {
    display: flex;
    gap: var(--edge-gap, 4px);
    padding: 2px;
  }

  .ring-top {
    grid-area: top;
    flex-direction: row;
    justify-content: space-between;
  }

  .ring-right {
    grid-area: right;
    flex-direction: column;
    justify-content: space-between;
  }

  .ring-bottom {
    grid-area: bottom;
    flex-direction: row;
    justify-content: space-between;
  }

  .ring-left {
    grid-area: left;
    flex-direction: column;
    justify-content: space-between;
  }

  .ring-center {
    grid-area: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
    min-height: 0;
  }

  /* === Corner Connectors === */
  .corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(102, 126, 234, 0.4), transparent);
  }
  .corner-tr {
    top: 0;
    right: 0;
  }
  .corner-br {
    bottom: 0;
    right: 0;
  }
  .corner-bl {
    bottom: 0;
    left: 0;
  }
  .corner-tl {
    top: 0;
    left: 0;
  }

  /* === Cell Design (dynamic via CSS vars) === */
  .board-cell {
    position: relative;
    width: var(--cell-size, 56px);
    height: var(--cell-size, 56px);
    border-radius: var(--cell-border-radius, 12px);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 35, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.08);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
    flex-shrink: 0;
    overflow: visible;
  }

  .board-cell::before {
    content: '';
    position: absolute;
    inset: -4px;
    z-index: 1;
  }

  .board-cell:hover {
    transform: scale(1.12);
    z-index: 5;
  }

  .board-cell .cell-glow {
    position: absolute;
    inset: -2px;
    border-radius: calc(var(--cell-border-radius, 12px) + 2px);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    display: none;
  }

  .board-cell:hover .cell-glow,
  .board-cell.cell-occupied .cell-glow {
    display: block;
    opacity: 0.4;
  }

  .board-cell:hover .cell-glow {
    opacity: 0.8;
  }

  .board-cell .cell-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .board-cell .cell-number {
    position: absolute;
    bottom: 1px;
    right: 2px;
    font-size: 0.5rem;
    font-weight: 600;
    opacity: 0.4;
    z-index: 2;
  }

  /* Cell type styles */
  .cell-punishment {
    border-color: rgba(255, 71, 87, 0.4);
    box-shadow: 0 0 8px rgba(255, 71, 87, 0.15);
  }
  .cell-punishment .cell-glow {
    background: radial-gradient(circle, rgba(255, 71, 87, 0.3), transparent 70%);
  }
  .cell-punishment .cell-icon {
    color: #ff4757;
  }
  .cell-punishment:hover {
    border-color: rgba(255, 71, 87, 0.7);
    box-shadow: 0 0 16px rgba(255, 71, 87, 0.4);
  }

  .cell-chain_punishment {
    border-color: rgba(255, 165, 2, 0.4);
    box-shadow: 0 0 8px rgba(255, 165, 2, 0.15);
  }
  .cell-chain_punishment .cell-glow {
    background: radial-gradient(circle, rgba(255, 165, 2, 0.3), transparent 70%);
  }
  .cell-chain_punishment .cell-icon {
    color: #ffa502;
  }
  .cell-chain_punishment:hover {
    border-color: rgba(255, 165, 2, 0.7);
    box-shadow: 0 0 16px rgba(255, 165, 2, 0.4);
  }

  .cell-bonus {
    border-color: rgba(46, 213, 115, 0.4);
    box-shadow: 0 0 8px rgba(46, 213, 115, 0.15);
  }
  .cell-bonus .cell-glow {
    background: radial-gradient(circle, rgba(46, 213, 115, 0.3), transparent 70%);
  }
  .cell-bonus .cell-icon {
    color: #2ed573;
  }
  .cell-bonus:hover {
    border-color: rgba(46, 213, 115, 0.7);
    box-shadow: 0 0 16px rgba(46, 213, 115, 0.4);
  }

  .cell-special {
    border-color: rgba(255, 165, 2, 0.4);
    box-shadow: 0 0 8px rgba(255, 165, 2, 0.15);
  }
  .cell-special .cell-glow {
    background: radial-gradient(circle, rgba(255, 165, 2, 0.3), transparent 70%);
  }
  .cell-special .cell-icon {
    color: #ffa502;
  }
  .cell-special:hover {
    border-color: rgba(255, 165, 2, 0.7);
    box-shadow: 0 0 16px rgba(255, 165, 2, 0.4);
  }

  .cell-restart {
    border-color: rgba(168, 85, 247, 0.4);
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.15);
  }
  .cell-restart .cell-glow {
    background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent 70%);
  }
  .cell-restart .cell-icon {
    color: #a855f7;
  }
  .cell-restart:hover {
    border-color: rgba(168, 85, 247, 0.7);
    box-shadow: 0 0 16px rgba(168, 85, 247, 0.4);
  }

  .cell-trap {
    border-color: rgba(220, 38, 38, 0.4);
    box-shadow: 0 0 8px rgba(220, 38, 38, 0.15);
  }
  .cell-trap .cell-glow {
    background: radial-gradient(circle, rgba(220, 38, 38, 0.3), transparent 70%);
  }
  .cell-trap .cell-icon {
    color: #dc2626;
  }
  .cell-trap:hover {
    border-color: rgba(220, 38, 38, 0.7);
    box-shadow: 0 0 16px rgba(220, 38, 38, 0.4);
  }

  .cell-start {
    border-color: rgba(102, 126, 234, 0.6);
    box-shadow: 0 0 12px rgba(102, 126, 234, 0.3);
    background: rgba(102, 126, 234, 0.1);
  }

  .cell-occupied {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }

  /* === Cell Animations === */
  .cell-activated {
    animation: cellPulse 0.5s ease-out 3;
  }

  .cell-landing {
    animation: cellLand 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes cellPulse {
    0%,
    100% {
      box-shadow: 0 0 8px currentColor;
    }
    50% {
      box-shadow:
        0 0 24px currentColor,
        0 0 48px currentColor;
    }
  }

  @keyframes cellLand {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.2);
    }
    70% {
      transform: scale(0.95);
    }
    100% {
      transform: scale(1);
    }
  }

  .cell-landing::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: calc(var(--cell-border-radius, 12px) + 4px);
    border: 2px solid rgba(255, 255, 255, 0.5);
    animation: ripple 0.8s ease-out forwards;
    pointer-events: none;
  }

  @keyframes ripple {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }

  /* === Player Markers (dynamic via CSS vars) === */
  .cell-players {
    position: absolute;
    top: var(--marker-offset, -12px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
  }

  .player-marker {
    width: var(--marker-size, 24px);
    height: var(--marker-size, 24px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: calc(var(--marker-size, 24px) * 0.4);
    border: 2px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    text-transform: uppercase;
    position: absolute;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .player-marker.current-player {
    border-color: #ffd700;
    box-shadow:
      0 0 8px rgba(255, 215, 0, 0.6),
      0 0 20px rgba(255, 215, 0, 0.3);
    animation: playerPulse 2s ease-in-out infinite;
    will-change: transform, box-shadow;
  }

  .player-marker.player-moving {
    animation: playerBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes playerPulse {
    0%,
    100% {
      box-shadow:
        0 0 8px rgba(255, 215, 0, 0.6),
        0 0 20px rgba(255, 215, 0, 0.3);
      transform: translateY(-2px);
    }
    50% {
      box-shadow:
        0 0 14px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
      transform: translateY(-5px);
    }
  }

  @keyframes playerBounce {
    0% {
      transform: translateY(0) scale(1);
    }
    30% {
      transform: translateY(-10px) scale(1.1);
    }
    60% {
      transform: translateY(-3px) scale(0.95);
    }
    100% {
      transform: translateY(0) scale(1);
    }
  }

  /* === Center Area === */
  .center-dice {
    transform-origin: center;
    transform: scale(var(--dice-scale, 1));
  }

  .center-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.6rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .status-player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 9px;
    text-transform: uppercase;
  }

  .status-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .status-turn {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
  }

  .status-position {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .start-zone {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    background: rgba(102, 126, 234, 0.08);
    border: 1px dashed rgba(102, 126, 234, 0.3);
    border-radius: 8px;
  }

  .start-zone-icon {
    color: var(--color-accent-light);
    opacity: 0.6;
  }

  .start-zone-players {
    display: flex;
    gap: 0.3rem;
  }

  .start-marker {
    position: static !important;
    transform: none !important;
  }

  .center-effect {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.8rem;
    background: rgba(102, 126, 234, 0.15);
    border: 1px solid rgba(102, 126, 234, 0.3);
    border-radius: 8px;
    font-size: 0.75rem;
    color: var(--color-accent-light);
    animation: effectSlideIn 0.4s ease-out;
    max-width: 200px;
    text-align: center;
  }

  @keyframes effectSlideIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* === Tooltip (desktop) === */
  .cell-tooltip {
    position: fixed;
    z-index: 10000;
    background: rgba(15, 15, 35, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.75rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    max-width: 220px;
    pointer-events: none;
    animation: tooltipIn 0.15s ease-out;
  }

  @keyframes tooltipIn {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tooltip-number {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .tooltip-type {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
  }
  .tooltip-type.type-punishment {
    color: #ff4757;
  }
  .tooltip-type.type-bonus {
    color: #2ed573;
  }
  .tooltip-type.type-special {
    color: #ffa502;
  }
  .tooltip-type.type-restart {
    color: #a855f7;
  }
  .tooltip-type.type-trap {
    color: #dc2626;
  }
  .tooltip-type.type-chain_punishment {
    color: #ffa502;
  }

  .tooltip-body {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .tooltip-desc {
    margin-bottom: 0.4rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .tooltip-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tooltip-details span {
    padding: 0.1rem 0.4rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 0.7rem;
  }

  /* === Mobile Tooltip (bottom bar) === */
  .mobile-tooltip-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(15, 15, 35, 0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    font-size: 0.8rem;
    color: var(--text-primary);
  }

  .mobile-tooltip-bar .tooltip-number {
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .mobile-tooltip-bar .tooltip-type {
    flex-shrink: 0;
  }

  .tooltip-desc-inline {
    font-size: 0.75rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-tooltip-enter-active {
    transition: transform 0.2s ease-out;
  }
  .mobile-tooltip-leave-active {
    transition: transform 0.15s ease-in;
  }
  .mobile-tooltip-enter-from,
  .mobile-tooltip-leave-to {
    transform: translateY(100%);
  }

  /* === Full-screen Effect Flash === */
  .effect-flash {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    opacity: 0.15;
    animation: flashPulse 0.5s ease-out;
  }

  .flash-punishment,
  .flash-chain_punishment {
    background: radial-gradient(circle at center, #ff4757, transparent 70%);
  }
  .flash-bonus {
    background: radial-gradient(circle at center, #2ed573, transparent 70%);
  }
  .flash-trap {
    background: radial-gradient(circle at center, #dc2626, transparent 70%);
  }
  .flash-restart {
    background: radial-gradient(circle at center, #a855f7, transparent 70%);
  }
  .flash-special {
    background: radial-gradient(circle at center, #ffa502, transparent 70%);
  }

  @keyframes flashPulse {
    0% {
      opacity: 0.25;
    }
    100% {
      opacity: 0;
    }
  }

  .flash-enter-active {
    animation: flashPulse 0.5s ease-out;
  }
  .flash-leave-active {
    animation: flashPulse 0.3s ease-out reverse;
  }

  /* === Landscape mode === */
  @media (orientation: landscape) and (max-height: 600px) {
    .game-board {
      padding: 0.25rem;
    }

    .ring-center {
      gap: 0.25rem;
      padding: 0.25rem;
    }
  }

  /* === Reduced motion === */
  @media (prefers-reduced-motion: reduce) {
    .board-cell,
    .player-marker,
    .center-effect {
      transition: none !important;
      animation: none !important;
    }

    .cell-landing::after {
      animation: none !important;
    }

    .player-marker.current-player {
      animation: none !important;
    }

    .effect-flash {
      display: none;
    }
  }
</style>
