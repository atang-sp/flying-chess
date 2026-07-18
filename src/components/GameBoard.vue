<script setup lang="ts">
  import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import type { BoardCell, Player } from '../types/game'
  import { CELL_ICON_NAMES } from '../config/gameConfig'
  import { Zap, Gift, Undo2, Moon, RotateCcw, Skull, Rocket, Sparkles, Link } from '@lucide/vue'
  import CoolDice from './CoolDice.vue'
  import ScorePanel from './ScorePanel.vue'
  import BoardParticles from './BoardParticles.vue'

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

  const boardRef = ref<HTMLElement | null>(null)
  const pathRef = ref<SVGPathElement | null>(null)
  const containerWidth = ref(0)
  const containerHeight = ref(0)
  const pathMounted = ref(0)
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    if (boardRef.value) {
      const rect = boardRef.value.getBoundingClientRect()
      containerWidth.value = rect.width || 0
      containerHeight.value = rect.height || 0
    }
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width
        }
        if (entry.contentRect.height > 0) {
          containerHeight.value = entry.contentRect.height
        }
      }
    })
    if (boardRef.value) {
      resizeObserver.observe(boardRef.value)
    }
    nextTick(() => {
      pathMounted.value++
    })
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
  })

  const isMobile = computed(() => containerWidth.value < 600)

  const svgWidth = computed(() => containerWidth.value || 800)
  const svgHeight = computed(() => containerHeight.value || 600)

  const trackPathD = computed(() => {
    const w = svgWidth.value
    const h = svgHeight.value
    const mx = isMobile.value ? 36 : 56
    const my = isMobile.value ? 36 : 48

    const isPortrait = h > w
    const rows = isPortrait ? 5 : 4
    const rowHeight = (h - my * 2) / (rows - 1)

    let d = `M ${mx} ${h - my}`
    for (let i = 1; i < rows; i++) {
      const y = h - my - i * rowHeight
      const prevY = h - my - (i - 1) * rowHeight
      const isEven = (i - 1) % 2 === 0
      const startX = isEven ? mx : w - mx
      const endX = isEven ? w - mx : mx
      const cpY = (prevY + y) / 2
      d += ` C ${startX} ${cpY}, ${endX} ${cpY}, ${endX} ${y}`
    }
    return d
  })

  const cellPositions = computed(() => {
    void pathMounted.value
    void containerWidth.value
    if (!pathRef.value || props.board.length === 0) return []
    const totalLen = pathRef.value.getTotalLength()
    if (totalLen === 0) return []

    const padding = totalLen * 0.01
    const usableLen = totalLen - padding * 2
    const count = props.board.length

    return props.board.map((cell, i) => {
      const ratio = count === 1 ? 0.5 : i / (count - 1)
      const point = pathRef.value!.getPointAtLength(padding + ratio * usableLen)
      return { ...cell, x: point.x, y: point.y }
    })
  })

  const cellSize = computed(() => {
    void pathMounted.value
    void containerWidth.value
    const totalCells = props.board.length || 40
    const pathLen = pathRef.value?.getTotalLength() ?? 1000
    const spacing = pathLen / totalCells
    const ideal = Math.floor(spacing * 0.7)
    return Math.max(28, Math.min(ideal, 56))
  })

  const cellIconSize = computed(() => Math.max(12, Math.round(cellSize.value * 0.4)))

  const markerSize = computed(() => Math.max(16, Math.min(Math.round(cellSize.value * 0.42), 24)))

  const boardCssVars = computed(() => ({
    '--marker-size': `${markerSize.value}px`,
  }))

  const diceScale = computed(() => {
    if (isMobile.value) return 0.6
    const s = cellSize.value
    if (s >= 50) return 0.85
    if (s >= 40) return 0.7
    return 0.6
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

  const getCellClass = (cell: BoardCell): string => {
    const classes = [`cell-${cell.type}`]
    if (props.players.some(p => p.position === cell.position)) classes.push('cell-occupied')
    if (activatedCell.value === cell.position) classes.push('cell-activated')
    if (landingCell.value === cell.position) classes.push('cell-landing')
    if (cell.position === 1) classes.push('cell-start')
    if (cell.position === props.board.length) classes.push('cell-end')
    return classes.join(' ')
  }

  const getCellIconComponent = (cell: BoardCell): string | null => {
    if (cell.effect?.type === 'rest') return 'Moon'
    if (cell.effect?.type === 'reverse') return 'Undo2'
    return CELL_ICON_NAMES[cell.type] || null
  }

  const getCellIcon = (cell: BoardCell) => {
    const name = getCellIconComponent(cell)
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

  const getPlayerOffset = (playerIndex: number, totalOnCell: number): { x: number; y: number } => {
    if (totalOnCell === 1) return { x: 0, y: 0 }
    const angle = ((2 * Math.PI) / totalOnCell) * playerIndex - Math.PI / 2
    const radius = Math.max(8, cellSize.value * 0.3)
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

  const centerPosition = computed(() => {
    const w = svgWidth.value
    const h = svgHeight.value
    return { x: w / 2, y: h / 2 }
  })

  defineExpose({ triggerCellActivation, triggerLanding })
</script>

<template>
  <div ref="boardRef" class="game-board" :style="boardCssVars" @click="handleBoardClick">
    <!-- Particle background -->
    <BoardParticles />

    <template v-if="containerWidth > 0">
      <!-- SVG Track Layer -->
      <svg
        class="board-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        :width="svgWidth"
        :height="svgHeight"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="trackGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.8" />
            <stop offset="40%" stop-color="#667eea" stop-opacity="0.9" />
            <stop offset="70%" stop-color="#a855f7" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.8" />
          </linearGradient>
          <linearGradient id="trackGlowGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.3" />
            <stop offset="50%" stop-color="#667eea" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#a855f7" stop-opacity="0.3" />
          </linearGradient>
          <filter id="trackGlow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <filter id="trackGlowWide">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          </filter>
        </defs>

        <!-- Wide glow behind track -->
        <path
          :d="trackPathD"
          fill="none"
          stroke="url(#trackGlowGradient)"
          stroke-width="28"
          stroke-linecap="round"
          filter="url(#trackGlowWide)"
          class="track-glow-wide"
        />
        <!-- Medium glow -->
        <path
          :d="trackPathD"
          fill="none"
          stroke="url(#trackGlowGradient)"
          stroke-width="14"
          stroke-linecap="round"
          filter="url(#trackGlow)"
          class="track-glow"
        />
        <!-- Main track path -->
        <path
          ref="pathRef"
          :d="trackPathD"
          fill="none"
          stroke="url(#trackGradient)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="8 4"
          class="track-main"
        />
        <!-- Energy flow overlay -->
        <path
          :d="trackPathD"
          fill="none"
          stroke="url(#trackGradient)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="4 40"
          class="track-energy"
        />
      </svg>

      <!-- Cell Layer (absolutely positioned on top of SVG) -->
      <div class="cell-layer">
        <div
          v-for="cell in cellPositions"
          :key="cell.id"
          class="board-cell"
          :class="getCellClass(cell)"
          :style="{
            width: cellSize + 'px',
            height: cellSize + 'px',
            transform: `translate(${cell.x - cellSize / 2}px, ${cell.y - cellSize / 2}px)`,
          }"
          @click="handleCellClick(cell)"
          @mouseenter="showTooltip(cell, $event)"
          @mouseleave="hideTooltip"
          @touchstart.passive="handleTouchStart(cell, $event)"
          @touchend.passive="handleTouchEnd()"
          @touchmove.passive="handleTouchMove()"
        >
          <div class="cell-aura"></div>
          <div class="cell-ring"></div>
          <div class="cell-inner">
            <component :is="getCellIcon(cell)" v-if="getCellIcon(cell)" :size="cellIconSize" />
          </div>
          <span class="cell-number">{{ cell.position }}</span>
          <div class="cell-players">
            <div
              v-for="(player, pIdx) in getPlayersOnCell(cell.position)"
              :key="'p-' + player.id"
              class="player-marker"
              :class="{
                'current-player': player.id === currentPlayer?.id,
                'player-moving': player.isMoving,
              }"
              :style="{
                backgroundColor: player.color,
                transform: `translate(${getPlayerOffset(pIdx, getPlayersOnCell(cell.position).length).x}px, ${getPlayerOffset(pIdx, getPlayersOnCell(cell.position).length).y}px)`,
              }"
            >
              {{ player.name.charAt(0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Center Panel (Dice + Scoreboard) -->
      <div
        class="center-panel"
        :style="{ left: centerPosition.x + 'px', top: centerPosition.y + 'px' }"
      >
        <div class="center-dice" :style="{ transform: `scale(${diceScale})` }">
          <CoolDice
            :can-roll="canRoll ?? false"
            :value="diceValue ?? null"
            @roll="handleDiceRoll"
          />
        </div>
        <ScorePanel
          v-if="!isMobile"
          :players="players"
          :current-player-index="currentPlayerIndex"
          :total-cells="board.length"
          :last-effect="lastEffect"
          :turn-count="turnCount"
        />
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
      </div>

      <!-- Mobile bottom status bar -->
      <div v-if="isMobile && currentPlayer" class="mobile-status-bar">
        <span class="status-avatar" :style="{ backgroundColor: currentPlayer.color }">
          {{ currentPlayer.name.charAt(0) }}
        </span>
        <span class="status-name">{{ currentPlayer.name }}</span>
        <span class="status-pos">
          {{ currentPlayer.position === 0 ? '起飞区' : `#${currentPlayer.position}` }}
        </span>
        <span v-if="turnCount" class="status-turn">R{{ turnCount }}</span>
        <span v-if="lastEffect" class="status-effect">{{ lastEffect }}</span>
      </div>

      <!-- Desktop tooltip -->
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
                  移动 {{ tooltipCell.effect.value > 0 ? '+' : ''
                  }}{{ tooltipCell.effect.value }} 步
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
    </template>

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
    position: absolute;
    inset: 0.5rem;
    overflow: hidden;
    contain: paint;
    border-radius: 16px;
    background:
      radial-gradient(ellipse at 30% 20%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 80%, rgba(168, 85, 247, 0.06) 0%, transparent 50%),
      linear-gradient(180deg, #080818 0%, #0a0a1a 50%, #0d0820 100%);
  }

  @media (max-width: 768px) {
    .game-board {
      inset: 0.25rem;
    }
  }

  /* === SVG Track === */
  .board-svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .track-main {
    opacity: 0.9;
  }

  .track-glow {
    opacity: 0.5;
  }

  .track-glow-wide {
    opacity: 0.3;
  }

  .track-energy {
    opacity: 0.8;
    animation: energyFlow 4s linear infinite;
  }

  @keyframes energyFlow {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -88;
    }
  }

  /* === Cell Layer === */
  .cell-layer {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }

  .board-cell {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 50%;
    cursor: pointer;
    pointer-events: all;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform;
    transition:
      box-shadow 0.2s ease,
      filter 0.2s ease;
  }

  .cell-inner {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(12, 12, 30, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition:
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  .cell-ring {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.06);
    z-index: 2;
    pointer-events: none;
  }

  .cell-aura {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    opacity: 0;
    z-index: 1;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .board-cell:hover .cell-aura {
    opacity: 1;
  }

  .board-cell:hover .cell-inner {
    transform: scale(1.12);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .board-cell:hover {
    z-index: 10;
  }

  .cell-number {
    position: absolute;
    bottom: -2px;
    right: 2px;
    font-size: 0.5rem;
    font-weight: 700;
    opacity: 0.4;
    z-index: 4;
    pointer-events: none;
  }

  /* === Cell Type Styles === */
  .cell-punishment .cell-inner {
    border-color: rgba(255, 71, 87, 0.5);
    color: #ff4757;
    box-shadow: inset 0 0 8px rgba(255, 71, 87, 0.15);
  }
  .cell-punishment .cell-aura {
    background: radial-gradient(circle, rgba(255, 71, 87, 0.25), transparent 70%);
  }
  .cell-punishment .cell-ring {
    border-color: rgba(255, 71, 87, 0.2);
  }
  .cell-punishment::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
      from var(--aura-angle, 0deg),
      rgba(255, 71, 87, 0.3),
      transparent 30%,
      rgba(255, 99, 72, 0.2),
      transparent 60%,
      rgba(255, 71, 87, 0.3)
    );
    animation: auraRotate 4s linear infinite;
    opacity: 0.6;
    z-index: 0;
    pointer-events: none;
  }

  .cell-chain_punishment .cell-inner {
    border-color: rgba(255, 165, 2, 0.5);
    color: #ffa502;
    box-shadow: inset 0 0 8px rgba(255, 165, 2, 0.15);
  }
  .cell-chain_punishment .cell-aura {
    background: radial-gradient(circle, rgba(255, 165, 2, 0.25), transparent 70%);
  }
  .cell-chain_punishment .cell-ring {
    border-color: rgba(255, 165, 2, 0.2);
  }
  .cell-chain_punishment::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
      from var(--aura-angle, 0deg),
      rgba(255, 165, 2, 0.3),
      transparent 30%,
      rgba(255, 140, 0, 0.2),
      transparent 60%,
      rgba(255, 165, 2, 0.3)
    );
    animation: auraRotate 3.5s linear infinite;
    opacity: 0.6;
    z-index: 0;
    pointer-events: none;
  }

  .cell-bonus .cell-inner {
    border-color: rgba(46, 213, 115, 0.5);
    color: #2ed573;
    box-shadow: inset 0 0 8px rgba(46, 213, 115, 0.15);
  }
  .cell-bonus .cell-aura {
    background: radial-gradient(circle, rgba(46, 213, 115, 0.25), transparent 70%);
  }
  .cell-bonus .cell-ring {
    border-color: rgba(46, 213, 115, 0.2);
  }
  .cell-bonus::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(46, 213, 115, 0.2), transparent 70%);
    animation: auraPulse 2.5s ease-in-out infinite;
    z-index: 0;
    pointer-events: none;
  }

  .cell-restart .cell-inner {
    border-color: rgba(168, 85, 247, 0.5);
    color: #a855f7;
    box-shadow: inset 0 0 8px rgba(168, 85, 247, 0.15);
  }
  .cell-restart .cell-aura {
    background: radial-gradient(circle, rgba(168, 85, 247, 0.25), transparent 70%);
  }
  .cell-restart .cell-ring {
    border-color: rgba(168, 85, 247, 0.2);
  }
  .cell-restart::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: conic-gradient(
      from var(--aura-angle, 0deg),
      rgba(168, 85, 247, 0.35),
      transparent 40%,
      rgba(139, 92, 246, 0.2),
      transparent 70%,
      rgba(168, 85, 247, 0.35)
    );
    animation: auraRotate 5s linear infinite reverse;
    opacity: 0.6;
    z-index: 0;
    pointer-events: none;
  }

  .cell-trap .cell-inner {
    border-color: rgba(220, 38, 38, 0.5);
    color: #dc2626;
    box-shadow: inset 0 0 8px rgba(220, 38, 38, 0.2);
  }
  .cell-trap .cell-aura {
    background: radial-gradient(circle, rgba(220, 38, 38, 0.25), transparent 70%);
  }
  .cell-trap .cell-ring {
    border-color: rgba(220, 38, 38, 0.25);
  }
  .cell-trap::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.3), transparent 60%);
    animation: dangerFlicker 1.8s steps(3) infinite;
    z-index: 0;
    pointer-events: none;
  }

  .cell-special .cell-inner {
    border-color: rgba(255, 165, 2, 0.5);
    color: #ffa502;
  }
  .cell-special .cell-aura {
    background: radial-gradient(circle, rgba(255, 165, 2, 0.2), transparent 70%);
  }

  /* Start & End cells - larger, special decorations */
  .cell-start .cell-inner {
    border-color: rgba(0, 210, 255, 0.6);
    color: #00d2ff;
    box-shadow:
      inset 0 0 12px rgba(0, 210, 255, 0.2),
      0 0 16px rgba(0, 210, 255, 0.2);
  }
  .cell-start .cell-ring {
    border-color: rgba(0, 210, 255, 0.3);
    inset: -5px;
  }
  .cell-start::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1.5px dashed rgba(0, 210, 255, 0.3);
    animation: auraRotate 8s linear infinite;
    z-index: 0;
    pointer-events: none;
  }

  .cell-end .cell-inner {
    border-color: rgba(251, 191, 36, 0.6);
    color: #fbbf24;
    box-shadow:
      inset 0 0 12px rgba(251, 191, 36, 0.2),
      0 0 16px rgba(251, 191, 36, 0.2);
  }
  .cell-end .cell-ring {
    border-color: rgba(251, 191, 36, 0.3);
    inset: -5px;
  }
  .cell-end::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1.5px dashed rgba(251, 191, 36, 0.3);
    animation: auraRotate 8s linear infinite reverse;
    z-index: 0;
    pointer-events: none;
  }

  .cell-occupied .cell-inner {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
  }

  /* === Animations === */
  @property --aura-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  @keyframes auraRotate {
    from {
      --aura-angle: 0deg;
    }
    to {
      --aura-angle: 360deg;
    }
  }

  @keyframes auraPulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.15);
    }
  }

  @keyframes dangerFlicker {
    0%,
    100% {
      opacity: 0.5;
    }
    33% {
      opacity: 0.9;
    }
    66% {
      opacity: 0.3;
    }
  }

  .cell-activated .cell-inner {
    animation: cellPulse 0.5s ease-out 3;
  }

  .cell-landing .cell-inner {
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
      transform: scale(1.25);
    }
    70% {
      transform: scale(0.93);
    }
    100% {
      transform: scale(1);
    }
  }

  /* === Player Markers === */
  .cell-players {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
  }

  .player-marker {
    width: var(--marker-size, 20px);
    height: var(--marker-size, 20px);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.55rem;
    border: 2px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
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
    }
    50% {
      box-shadow:
        0 0 14px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
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

  /* === Center Panel === */
  .center-panel {
    position: absolute;
    z-index: 5;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    pointer-events: all;
  }

  .center-dice {
    transform-origin: center;
  }

  .start-zone {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    background: rgba(102, 126, 234, 0.1);
    border: 1px dashed rgba(102, 126, 234, 0.3);
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }

  .start-zone-icon {
    color: rgba(102, 126, 234, 0.7);
  }

  .start-zone-players {
    display: flex;
    gap: 0.25rem;
  }

  .start-marker {
    position: static !important;
    transform: none !important;
  }

  /* === Mobile Status Bar === */
  .mobile-status-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    padding-bottom: calc(0.4rem + env(safe-area-inset-bottom));
    background: rgba(10, 10, 26, 0.9);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
  }

  .status-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.5rem;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .status-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .status-pos {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
  }

  .status-turn {
    font-size: 0.6rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
  }

  .status-effect {
    color: var(--color-accent-light);
    margin-left: auto;
    font-size: 0.65rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* === Tooltip === */
  .cell-tooltip {
    position: fixed;
    z-index: 10000;
    background: rgba(12, 12, 30, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 0.75rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
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

  /* === Mobile Tooltip === */
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
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    background: rgba(12, 12, 30, 0.95);
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

  /* === Effect Flash === */
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

  /* === Mobile Cell Aura Tightening === */
  @media (max-width: 600px) {
    .cell-aura {
      inset: -4px;
    }
    .cell-punishment::after,
    .cell-chain_punishment::after,
    .cell-restart::after {
      inset: -2px;
    }
    .cell-bonus::after {
      inset: -3px;
    }
    .cell-trap::after {
      inset: -3px;
    }
    .cell-start::after,
    .cell-end::after {
      inset: -4px;
    }
  }

  /* === Reduced Motion === */
  @media (prefers-reduced-motion: reduce) {
    .board-cell,
    .board-cell::after,
    .player-marker,
    .track-energy,
    .cell-aura {
      transition: none !important;
      animation: none !important;
    }

    .cell-landing .cell-inner,
    .cell-activated .cell-inner {
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
