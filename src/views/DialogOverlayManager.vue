<script setup lang="ts">
import PunishmentDisplay from '../components/PunishmentDisplay.vue'
import MercyDecision from '../components/MercyDecision.vue'
import EffectDisplay from '../components/EffectDisplay.vue'
import TakeoffPunishmentDisplay from '../components/TakeoffPunishmentDisplay.vue'
import TrapDisplay from '../components/TrapDisplay.vue'
import TrapChoiceDisplay from '../components/TrapChoiceDisplay.vue'
import QADisplay from '../components/QADisplay.vue'
import DareDisplay from '../components/DareDisplay.vue'
import BounceDisplay from '../components/BounceDisplay.vue'
import DoublePunishmentReveal from '../components/DoublePunishmentReveal.vue'
import ChainPunishmentRoll from '../components/ChainPunishmentRoll.vue'
import PartyReactionOverlay from '../components/PartyReactionOverlay.vue'
import PartyDiceDecision from '../components/PartyDiceDecision.vue'
import PartyPunishmentChoice from '../components/PartyPunishmentChoice.vue'
import PartyPunishmentIntervention from '../components/PartyPunishmentIntervention.vue'
import PartyEventCardOverlay from '../components/PartyEventCardOverlay.vue'
import PartyMiniGame from '../components/PartyMiniGame.vue'
import PartyTieBreak from '../components/PartyTieBreak.vue'
import VictoryScreen from '../components/VictoryScreen.vue'
import TakeoffReliefDisplay from '../components/TakeoffReliefDisplay.vue'
import SessionPauseOverlay from '../components/SessionPauseOverlay.vue'
import { Pause } from 'lucide-vue-next' // Fix import if needed, assuming it's available

defineProps<{
  activeMode: any
  bounceFinalPosition: number
  bounceFromPosition: number
  bounceOverflowSteps: number
  bounceTargetPosition: number
  canCurrentPlayerReroll: boolean
  canRequestBoardMercy: boolean
  canRequestTakeoffMercy: boolean
  currentDareInstruction: string
  currentPartyEvent: any
  currentPartyMiniGameKind: any
  currentPartyTokens: number
  currentPunishment: any
  currentPunishmentCountMultiplier: number
  currentPunishmentCountSelection: number
  currentPunishmentExecutor: any
  currentPunishmentTarget: any
  currentPunishmentVariant: any
  currentPunishmentVariantPhase: any
  currentQAQuestion: any
  currentTakeoffDiceValue: number
  currentTakeoffExecutorIndex: number
  currentTakeoffPunishment: any
  currentTakeoffTarget: any
  currentTakeoffTriggeringPlayer: any
  currentTrapChoiceA: any
  currentTrapChoiceB: any
  currentTrapDescription: string
  currentTrapRouletteTarget: any
  currentTrapVariant: any
  effectFromPosition: number | undefined
  effectToPosition: number | undefined
  failedTakeoffCountForMessage: number
  gameState: any
  mercyExecutorPlayer: any
  mercyHalvedStrikes: number
  mercySource: string
  mercyTargetPlayer: any
  multiDevice: any
  multiDeviceEnabled: boolean
  partyDiceDecisionVisible: boolean
  partyHighlight: any
  partyPunishmentChoices: any
  partyPunishmentInterventionResolution: any
  partyReaction: any
  partySession: any
  partyTieCandidates: any
  sessionPaused: boolean
  sharedScreenPunishmentInterventionOptions: any
  showBounceDisplay: boolean
  showChainPunishmentRoll: boolean
  showDareDisplay: boolean
  showDoublePunishmentReveal: boolean
  showMercyDecision: boolean
  showQADisplay: boolean
  showTakeoffPunishmentDisplay: boolean
  showTakeoffReliefDisplay: boolean
  showTrapChoiceDisplay: boolean
  showTrapDisplay: boolean
  showVictoryScreen: boolean
  canPauseSession: boolean
  hasActiveForcedOverlay: boolean
  victoryConfig: any
  lanPairingAnswerInput: string
}>()

import { ref } from "vue"

const partyTieBreakRef = ref()
defineExpose({ partyTieBreakRef })

const emit = defineEmits([
  'confirmBounce',
  'confirmDare',
  'confirmDoubleReveal',
  'confirmEffect',
  'confirmPunishment',
  'confirmQAAnswer',
  'confirmQARefuse',
  'confirmTakeoffPunishment',
  'confirmTakeoffRelief',
  'confirmTrap',
  'confirmTrapChoice',
  'continuePartyMove',
  'endPausedSession',
  'finishPartyMiniGame',
  'finishPartyTieBreak',
  'handleChainRollResult',
  'handleMercyRequest',
  'handleMercyResult',
  'handlePartyReactionDecision',
  'handlePartyReactionPrediction',
  'handlePartyReroll',
  'handlePunishmentVariantAction',
  'handleVictoryPlayAgain',
  'requestPartyTieBreakRoll',
  'resolveCurrentPartyEvent',
  'resolvePartyPunishmentChoice',
  'resolvePartyPunishmentIntervention',
  'resumeSession',
  'skipPunishment',
  'startCurrentEventMiniGame',
  'update:lanPairingAnswerInput',
  'submitLanPairingAnswer',
  'pauseSession',
])

</script>

<template>
  <div class="dialog-manager">
      <!-- 惩罚显示弹窗 -->
      <PunishmentDisplay
        :punishment="currentPunishment"
        :executor-player="currentPunishmentExecutor"
        :target-player="currentPunishmentTarget"
        :count-selection="currentPunishmentCountSelection"
        :count-multiplier="currentPunishmentCountMultiplier"
        :variant="currentPunishmentVariant"
        :variant-phase="currentPunishmentVariantPhase"
        :can-request-mercy="canRequestBoardMercy"
        @confirm="emit('confirmPunishment')"
        @skip="emit('skipPunishment')"
        @request-mercy="emit('handleMercyRequest', 'board')"
        @variant-action="emit('handlePunishmentVariantAction')"
      />

      <!-- 求饶决策弹窗 -->
      <MercyDecision
        :visible="showMercyDecision"
        :punishment="mercySource === 'board' ? currentPunishment : currentTakeoffPunishment"
        :executor-player="mercyExecutorPlayer"
        :target-player="mercyTargetPlayer"
        :halved-strikes="mercyHalvedStrikes"
        @mercy-result="emit('handleMercyResult')"
      />

      <!-- 效果显示弹窗 -->
      <EffectDisplay
        :visible="gameState.gameStatus === 'showing_effect'"
        :effect="gameState.pendingEffect"
        :from-position="effectFromPosition"
        :to-position="effectToPosition"
        @confirm="emit('confirmEffect')"
      />
    </div>

    <!-- 起飞惩罚显示弹窗 -->
    <TakeoffPunishmentDisplay
      :visible="showTakeoffPunishmentDisplay"
      :punishment="currentTakeoffPunishment"
      :dice-value="currentTakeoffDiceValue"
      :executor-name="
        currentTakeoffExecutorIndex !== undefined && currentTakeoffExecutorIndex >= 0
          ? gameState.players[currentTakeoffExecutorIndex]?.name || ''
          : ''
      "
      :target-name="currentTakeoffTarget?.name ?? ''"
      :triggering-player-name="currentTakeoffTriggeringPlayer?.name ?? ''"
      :can-request-mercy="canRequestTakeoffMercy"
      @confirm="emit('confirmTakeoffPunishment')"
      @request-mercy="emit('handleMercyRequest', 'takeoff')"
    />

    <!-- 机关陷阱弹窗 -->
    <TrapDisplay
      :show="showTrapDisplay"
      :trap-description="currentTrapDescription"
      @confirm="emit('confirmTrap')"
    />

    <TrapChoiceDisplay
      :show="showTrapChoiceDisplay"
      :description="currentTrapDescription"
      :choice-a="currentTrapChoiceA"
      :choice-b="currentTrapChoiceB"
      :player="gameState.players[gameState.currentPlayerIndex]"
      :roulette-target="currentTrapRouletteTarget"
      :trap-variant="currentTrapVariant"
      @choose="emit('confirmTrapChoice')"
      @confirm="emit('confirmTrap')"
    />

    <QADisplay
      :show="showQADisplay"
      :question="currentQAQuestion"
      :player="gameState.players[gameState.currentPlayerIndex]"
      @answer="emit('confirmQAAnswer')"
      @refuse="emit('confirmQARefuse')"
    />

    <DareDisplay
      :show="showDareDisplay"
      :instruction="currentDareInstruction"
      :player="gameState.players[gameState.currentPlayerIndex]"
      @confirm="emit('confirmDare')"
    />

    <!-- 反弹效果弹窗 -->
    <BounceDisplay
      :visible="showBounceDisplay"
      :from-position="bounceFromPosition"
      :target-position="bounceTargetPosition"
      :final-position="bounceFinalPosition"
      :overflow-steps="bounceOverflowSteps"
      :end-point="gameState.board.length"
      @confirm="emit('confirmBounce')"
    />

    <!-- 翻倍惩罚揭示弹窗 -->
    <DoublePunishmentReveal :visible="showDoublePunishmentReveal" @confirm="emit('confirmDoubleReveal')" />

    <!-- 连锁惩罚掷骰弹窗 -->
    <ChainPunishmentRoll :visible="showChainPunishmentRoll" @result="emit('handleChainRollResult')" />

    <PartyReactionOverlay
      v-if="
        !multiDeviceEnabled || !multiDevice.isRemotePlayer(partyReaction?.reactorPlayerIndex ?? -1)
      "
      :reaction="partyReaction"
      :players="gameState.players"
      :paused="sessionPaused"
      @predict="emit('handlePartyReactionPrediction')"
      @decide="emit('handlePartyReactionDecision')"
    />

    <PartyDiceDecision
      v-if="!multiDeviceEnabled || !multiDevice.isRemotePlayer(gameState.currentPlayerIndex)"
      :visible="partyDiceDecisionVisible"
      :player-name="gameState.players[gameState.currentPlayerIndex]?.name ?? '当前玩家'"
      :dice-value="gameState.diceValue ?? 1"
      :tokens-remaining="currentPartyTokens"
      :can-reroll="canCurrentPlayerReroll"
      :paused="sessionPaused"
      @reroll="emit('handlePartyReroll')"
      @continue="emit('continuePartyMove')"
    />

    <PartyPunishmentChoice
      v-if="!multiDeviceEnabled || !multiDevice.isRemotePlayer(gameState.currentPlayerIndex)"
      :visible="partyPunishmentChoices.length === 2"
      :choices="partyPunishmentChoices"
      :tokens-remaining="currentPartyTokens"
      :paused="sessionPaused"
      @select="emit('resolvePartyPunishmentChoice')"
      @skip="emit('resolvePartyPunishmentChoice', )"
    />

    <PartyPunishmentIntervention
      :visible="partyPunishmentInterventionResolution !== null"
      :resolution="partyPunishmentInterventionResolution"
      :players="gameState.players"
      :options="sharedScreenPunishmentInterventionOptions"
      :tokens-remaining="partySession?.tokensRemaining ?? []"
      :paused="sessionPaused"
      @apply="emit('resolvePartyPunishmentIntervention')"
      @skip="emit('resolvePartyPunishmentIntervention', )"
    />

    <PartyEventCardOverlay
      :card="currentPartyEvent"
      :players="gameState.players"
      @resolve="emit('resolveCurrentPartyEvent')"
      @start-mini-game="emit('startCurrentEventMiniGame')"
    />

    <PartyMiniGame
      :visible="currentPartyMiniGameKind !== null"
      :kind="currentPartyMiniGameKind"
      :players="gameState.players"
      :actor-player-index="gameState.currentPlayerIndex"
      @complete="emit('finishPartyMiniGame')"
    />

    <PartyTieBreak
      ref="partyTieBreakRef"
      :visible="partyTieCandidates.length > 1"
      :players="gameState.players"
      :candidate-indices="partyTieCandidates"
      @turn="emit('requestPartyTieBreakRoll')"
      @winner="emit('finishPartyTieBreak')"
    />

    <!-- 胜利结算画面 -->
    <VictoryScreen
      :show="showVictoryScreen"
      :winner="gameState.winner"
      :all-players="gameState.players"
      :mode="activeMode"
      :party-highlight="partyHighlight"
      :victory-config="activeMode === 'party' ? victoryConfig : undefined"
      @play-again="emit('handleVictoryPlayAgain')"
    />

    <!-- 起飞失败过多自动起飞弹窗 -->
    <TakeoffReliefDisplay
      :visible="showTakeoffReliefDisplay"
      :failed-count="failedTakeoffCountForMessage"
      @confirm="emit('confirmTakeoffRelief')"
    />

    <!-- 多设备连接面板 -->
    <div
      v-if="
        multiDeviceEnabled && multiDevice.roomInfo.value && !multiDevice.allPlayersConnected.value
      "
      class="multi-device-lobby"
    >
      <div class="multi-device-lobby-card">
        <h2>等待玩家连接</h2>
        <p class="room-code-label">房间码</p>
        <p class="room-code">{{ multiDevice.roomInfo.value.roomId }}</p>
        <p class="room-url">{{ multiDevice.roomInfo.value.gameUrl }}</p>
        <div class="lan-pairing-panel">
          <p>1. 手机打开上方手柄地址；2. 将邀请粘贴到手机；3. 把手机生成的应答粘贴回来。</p>
          <small>原生 WebRTC 局域网直连：不使用默认云端信令或外部中继。</small>
          <label>
            <span>局域网配对邀请</span>
            <textarea
              :value="multiDevice.pairingOffer.value"
              readonly
              placeholder="正在收集局域网连接信息..."
              data-testid="lan-pairing-offer"
            />
          </label>
          <label>
            <span>手机配对应答</span>
            <textarea
              :value="lanPairingAnswerInput" @input="emit('update:lanPairingAnswerInput', ($event.target as HTMLInputElement).value)"
              placeholder="粘贴手机生成的配对应答 JSON"
              data-testid="lan-pairing-answer-input"
            />
          </label>
          <button
            type="button"
            :disabled="!lanPairingAnswerInput.trim()"
            data-testid="lan-pairing-submit"
            @click="emit('submitLanPairingAnswer')"
          >
            建立局域网直连
          </button>
          <p v-if="multiDevice.pairingError.value" class="lan-pairing-error">
            {{ multiDevice.pairingError.value }}
          </p>
        </div>
        <div class="connection-list">
          <div
            v-for="player in gameState.players"
            :key="player.id"
            class="connection-item"
            :class="{
              connected: multiDevice.connectedPlayers.value.some(
                c => c.playerIndex === player.id - 1 && c.status === 'connected'
              ),
            }"
          >
            <span class="player-dot" :style="{ background: player.color }" />
            <span>{{ player.name }}</span>
            <span class="connection-status-icon">
              {{
                multiDevice.connectedPlayers.value.some(
                  c => c.playerIndex === player.id - 1 && c.status === 'connected'
                )
                  ? '✓'
                  : '...'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="canPauseSession && !sessionPaused"
      class="session-pause-trigger"
      :class="{ 'session-pause-trigger--blocked': hasActiveForcedOverlay }"
      aria-label="暂停本局"
      @click="emit('pauseSession')"
    >
      <Pause :size="18" aria-hidden="true" />
      <span>暂停本局</span>
    </button>

    <SessionPauseOverlay
      :visible="sessionPaused"
      @resume="emit('resumeSession')"
      @end-session="emit('endPausedSession')"
    />


  </div>
</template>
