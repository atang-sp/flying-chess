import { ref } from "vue";
<script setup lang="ts">
import { Dices, Volume2, VolumeX } from '@lucide/vue'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import PButton from 'primevue/button'

import GameRoster from '../components/GameRoster.vue'
import PartyHeatMeter from '../components/PartyHeatMeter.vue'
import GameBoard from '../components/GameBoard.vue'
import GameTurnDock from '../components/GameTurnDock.vue'
import CellInspector from '../components/CellInspector.vue'

defineProps<{
  gameStarted: boolean
  gameFinished: boolean
  turnCount: number
  gameState: any
  gameStatusText: string
  getStatusSeverity: (status: string) => string
  isPartyGame: boolean
  partyActLabel?: string
  partySession?: any
  RULESET_VERSION_BY_MODE: any
  multiDeviceEnabled: boolean
  multiDevice: any
  audioEnabled: boolean
  currentPartyHeatContribution: number
  partyRewardNotice: string
  selectedCellPosition: number | null
  hasActiveForcedOverlay: boolean
  sessionPaused: boolean
  partyInteractionBlocking: boolean
  isMobileView: boolean
  canRollDice: boolean
  lastEffect: string
  selectedBoardCell: any
  cellInspectorOpen: boolean
}>()

const emit = defineEmits([
  'game-controls-start',
  'victory-play-again',
  'toggle-audio',
  'cell-select',
  'dice-roll',
  'close-cell-inspector',
  'select-adjacent-cell',
  'locate-selected-cell'
])

// Fix methods in template calling directly instead of emit
const gameBoardRef = ref()
defineExpose({ gameBoardRef })

const handleGameControlsStart = () => emit('game-controls-start')
const handleVictoryPlayAgain = () => emit('victory-play-again')
const toggleAudio = () => emit('toggle-audio')
const handleCellSelect = (c: any) => emit('cell-select', c)
const handleDiceRoll = () => emit('dice-roll')
const closeCellInspector = () => emit('close-cell-inspector')
const selectAdjacentCell = (dir: number) => emit('select-adjacent-cell', dir)
const locateSelectedCell = () => emit('locate-selected-cell')
</script>

<template>
    <!-- 游戏页面 -->
    <div v-else class="game-page">
      <header class="game-header">
        <div class="header-content">
          <h1>
            <Dices :size="20" />
            惩罚飞行棋
          </h1>

          <div v-if="gameStarted" class="header-status">
            <Badge :value="turnCount" class="turn-badge" />
            <Tag
              :value="gameStatusText"
              :severity="getStatusSeverity(gameState.gameStatus)"
              class="status-tag"
            />
          </div>

          <GameRoster
            v-if="gameState.players.length > 0"
            :players="gameState.players"
            :current-player-index="gameState.currentPlayerIndex"
            :total-cells="gameState.board.length"
            :party-act-label="isPartyGame ? partyActLabel : undefined"
            :party-round="isPartyGame ? partySession?.roundNumber : undefined"
            :party-ruleset-version="isPartyGame ? RULESET_VERSION_BY_MODE.party : undefined"
            :tokens-remaining="
              isPartyGame && !multiDeviceEnabled ? partySession?.tokensRemaining : undefined
            "
            class="header-players"
          />

          <div class="header-actions">
            <span
              v-if="multiDeviceEnabled"
              class="multi-device-badge"
              :title="`多设备模式 - ${multiDevice.getConnectedPlayerCount()}/${gameState.players.length} 已连接`"
            >
              📱 {{ multiDevice.getConnectedPlayerCount() }}/{{ gameState.players.length }}
            </span>
            <PButton
              v-if="!gameStarted"
              label="开始游戏"
              icon="pi pi-play"
              class="p-button-success p-button-sm"
              @click="handleGameControlsStart"
            />
            <PButton
              v-if="gameFinished"
              label="再来一局"
              icon="pi pi-refresh"
              class="p-button-info p-button-sm"
              @click="handleVictoryPlayAgain"
            />
            <button
              class="audio-toggle-btn"
              :title="audioEnabled ? '静音' : '开启声音'"
              @click="toggleAudio"
            >
              <Volume2 v-if="audioEnabled" :size="18" />
              <VolumeX v-else :size="18" />
            </button>
          </div>
        </div>
      </header>

      <main class="game-main">
        <PartyHeatMeter
          v-if="isPartyGame && partySession"
          :heat="partySession.heat"
          :act="partySession.act"
          :heat-limit-pending="partySession.heatLimitPending"
          :current-player-contribution="currentPartyHeatContribution"
          :reward-notice="partyRewardNotice"
        />
        <div class="game-cockpit">
          <div class="board-section">
            <GameBoard
              ref="gameBoardRef"
              :board="gameState.board"
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
              :selected-position="selectedCellPosition"
              :interaction-disabled="
                hasActiveForcedOverlay || sessionPaused || gameFinished || partyInteractionBlocking
              "
              @select-cell="handleCellSelect"
            />
          </div>

          <aside v-if="!isMobileView" class="game-sidecar" aria-label="回合与格子信息">
            <GameTurnDock
              :players="gameState.players"
              :current-player-index="gameState.currentPlayerIndex"
              :total-cells="gameState.board.length"
              :can-roll="canRollDice"
              :dice-value="gameState.diceValue"
              :last-effect="lastEffect"
              :turn-count="turnCount"
              :mobile="false"
              @roll="handleDiceRoll"
            />
            <CellInspector
              :cell="selectedBoardCell"
              :total-cells="gameState.board.length"
              :players="gameState.players"
              :visible="true"
              :mobile="false"
              @close="cellInspectorOpen = false"
              @previous="selectAdjacentCell(-1)"
              @next="selectAdjacentCell(1)"
              @locate="locateSelectedCell"
            />
          </aside>
        </div>

        <GameTurnDock
          v-if="isMobileView"
          :players="gameState.players"
          :current-player-index="gameState.currentPlayerIndex"
          :total-cells="gameState.board.length"
          :can-roll="canRollDice"
          :dice-value="gameState.diceValue"
          :last-effect="lastEffect"
          :turn-count="turnCount"
          :mobile="true"
          @roll="handleDiceRoll"
        />

        <CellInspector
          v-if="isMobileView"
          :cell="selectedBoardCell"
          :total-cells="gameState.board.length"
          :players="gameState.players"
          :visible="cellInspectorOpen"
          :mobile="true"
          @close="closeCellInspector"
          @previous="selectAdjacentCell(-1)"
          @next="selectAdjacentCell(1)"
          @locate="locateSelectedCell"
        />
      </main>
    </div>


</template>

<style scoped>
/* Scoped styles will be migrated later or inherited from global */
</style>
