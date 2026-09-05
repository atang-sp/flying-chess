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
import { Upload } from '@lucide/vue'

import { inject } from 'vue'

const ctx = inject<any>('gameContext')
</script>

<template>
  <div v-if="ctx" class="dialog-manager">
    <!-- 惩罚显示弹窗 -->
    <PunishmentDisplay
      :punishment="ctx.currentPunishment"
      :executor-player="ctx.currentPunishmentExecutor"
      :target-player="ctx.currentPunishmentTarget"
      :count-selection="ctx.currentPunishmentCountSelection"
      :count-multiplier="ctx.currentPunishmentCountMultiplier"
      :variant="ctx.currentPunishmentVariant"
      :variant-phase="ctx.currentPunishmentVariantPhase"
      :can-request-mercy="ctx.canRequestBoardMercy"
      @confirm="ctx.confirmPunishment"
      @skip="ctx.skipPunishment"
      @request-mercy="ctx.handleMercyRequest('board')"
      @variant-action="ctx.handlePunishmentVariantAction"
    />

    <!-- 求饶决策弹窗 -->
    <MercyDecision
      :visible="ctx.showMercyDecision"
      :punishment="ctx.mercySource === 'board' ? ctx.currentPunishment : ctx.currentTakeoffPunishment"
      :executor-player="ctx.mercyExecutorPlayer"
      :target-player="ctx.mercyTargetPlayer"
      :halved-strikes="ctx.mercyHalvedStrikes"
      @mercy-result="ctx.handleMercyResult"
    />

    <!-- 效果显示弹窗 -->
    <EffectDisplay
      :visible="ctx.gameState.gameStatus === 'showing_effect'"
      :effect="ctx.gameState.pendingEffect"
      :from-position="ctx.effectFromPosition"
      :to-position="ctx.effectToPosition"
      @confirm="ctx.confirmEffect"
    />

    <!-- 起飞惩罚显示弹窗 -->
    <TakeoffPunishmentDisplay
      :visible="ctx.showTakeoffPunishmentDisplay"
      :punishment="ctx.currentTakeoffPunishment"
      :dice-value="ctx.currentTakeoffDiceValue"
      :executor-name="
        ctx.currentTakeoffExecutorIndex !== undefined && ctx.currentTakeoffExecutorIndex >= 0
          ? ctx.gameState.players[ctx.currentTakeoffExecutorIndex]?.name || ''
          : ''
      "
      :target-name="ctx.currentTakeoffTarget?.name ?? ''"
      :triggering-player-name="ctx.currentTakeoffTriggeringPlayer?.name ?? ''"
      :can-request-mercy="ctx.canRequestTakeoffMercy"
      @confirm="ctx.confirmTakeoffPunishment"
      @request-mercy="ctx.handleMercyRequest('takeoff')"
    />

    <!-- 机关陷阱弹窗 -->
    <TrapDisplay
      :show="ctx.showTrapDisplay"
      :trap-description="ctx.currentTrapDescription"
      @confirm="ctx.confirmTrap"
    />

    <TrapChoiceDisplay
      :show="ctx.showTrapChoiceDisplay"
      :description="ctx.currentTrapDescription"
      :choice-a="ctx.currentTrapChoiceA"
      :choice-b="ctx.currentTrapChoiceB"
      :player="ctx.gameState.players[ctx.gameState.currentPlayerIndex]"
      :roulette-target="ctx.currentTrapRouletteTarget"
      :trap-variant="ctx.currentTrapVariant"
      @choose="ctx.confirmTrapChoice"
      @confirm="ctx.confirmTrap"
    />

    <QADisplay
      :show="ctx.showQADisplay"
      :question="ctx.currentQAQuestion"
      :player="ctx.gameState.players[ctx.gameState.currentPlayerIndex]"
      @answer="ctx.confirmQAAnswer"
      @refuse="ctx.confirmQARefuse"
    />

    <DareDisplay
      :show="ctx.showDareDisplay"
      :instruction="ctx.currentDareInstruction"
      :player="ctx.gameState.players[ctx.gameState.currentPlayerIndex]"
      @confirm="ctx.confirmDare"
    />

    <!-- 反弹效果弹窗 -->
    <BounceDisplay
      :visible="ctx.showBounceDisplay"
      :from-position="ctx.bounceFromPosition"
      :target-position="ctx.bounceTargetPosition"
      :final-position="ctx.bounceFinalPosition"
      :overflow-steps="ctx.bounceOverflowSteps"
      :end-point="ctx.gameState.board.length"
      @confirm="ctx.confirmBounce"
    />

    <!-- 翻倍惩罚揭示弹窗 -->
    <DoublePunishmentReveal :visible="ctx.showDoublePunishmentReveal" @confirm="ctx.confirmDoubleReveal" />

    <!-- 连锁惩罚掷骰弹窗 -->
    <ChainPunishmentRoll :visible="ctx.showChainPunishmentRoll" @result="ctx.handleChainRollResult" />

    <PartyReactionOverlay
      v-if="
        !ctx.multiDeviceEnabled || !ctx.multiDevice.isRemotePlayer(ctx.partyReaction?.reactorPlayerIndex ?? -1)
      "
      :reaction="ctx.partyReaction"
      :players="ctx.gameState.players"
      :paused="ctx.sessionPaused"
      @predict="ctx.handlePartyReactionPrediction"
      @decide="ctx.handlePartyReactionDecision"
    />

    <PartyDiceDecision
      v-if="!ctx.multiDeviceEnabled || !ctx.multiDevice.isRemotePlayer(ctx.gameState.currentPlayerIndex)"
      :visible="ctx.partyDiceDecisionVisible"
      :player-name="ctx.gameState.players[ctx.gameState.currentPlayerIndex]?.name ?? '当前玩家'"
      :dice-value="ctx.gameState.diceValue ?? 1"
      :tokens-remaining="ctx.currentPartyTokens"
      :can-reroll="ctx.canCurrentPlayerReroll"
      :paused="ctx.sessionPaused"
      @reroll="ctx.handlePartyReroll"
      @continue="ctx.continuePartyMove"
    />

    <PartyPunishmentChoice
      v-if="!ctx.multiDeviceEnabled || !ctx.multiDevice.isRemotePlayer(ctx.gameState.currentPlayerIndex)"
      :visible="ctx.partyPunishmentChoices.length === 2"
      :choices="ctx.partyPunishmentChoices"
      :tokens-remaining="ctx.currentPartyTokens"
      :paused="ctx.sessionPaused"
      @select="ctx.resolvePartyPunishmentChoice"
      @skip="ctx.resolvePartyPunishmentChoice()"
    />

    <PartyPunishmentIntervention
      :visible="ctx.partyPunishmentInterventionResolution !== null"
      :resolution="ctx.partyPunishmentInterventionResolution"
      :players="ctx.gameState.players"
      :options="ctx.sharedScreenPunishmentInterventionOptions"
      :tokens-remaining="ctx.partySession?.tokensRemaining ?? []"
      :paused="ctx.sessionPaused"
      @apply="ctx.resolvePartyPunishmentIntervention"
      @skip="ctx.resolvePartyPunishmentIntervention()"
    />

    <PartyEventCardOverlay
      :card="ctx.currentPartyEvent"
      :players="ctx.gameState.players"
      @resolve="ctx.resolveCurrentPartyEvent"
      @start-mini-game="ctx.startCurrentEventMiniGame"
    />

    <PartyMiniGame
      :visible="ctx.currentPartyMiniGameKind !== null"
      :kind="ctx.currentPartyMiniGameKind"
      :players="ctx.gameState.players"
      :actor-player-index="ctx.gameState.currentPlayerIndex"
      @complete="ctx.finishPartyMiniGame"
    />

    <!-- 胜利结算画面 -->
    <VictoryScreen
      :show="ctx.showVictoryScreen"
      :winner="ctx.gameState.winner"
      :all-players="ctx.gameState.players"
      :mode="ctx.activeMode"
      :party-highlight="ctx.partyHighlight"
      :victory-config="ctx.activeMode === 'party' ? ctx.victoryConfig : undefined"
      @play-again="ctx.handleVictoryPlayAgain"
    />

    <!-- 起飞失败过多自动起飞弹窗 -->
    <TakeoffReliefDisplay
      :visible="ctx.showTakeoffReliefDisplay"
      :failed-count="ctx.failedTakeoffCountForMessage"
      @confirm="ctx.confirmTakeoffRelief"
    />
    
    <SessionPauseOverlay
      :visible="ctx.sessionPaused"
      @resume="ctx.resumeSession"
      @end-session="ctx.endPausedSession"
    />
  </div>
</template>
