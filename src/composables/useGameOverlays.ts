import { ref } from 'vue'
import type { Player, PunishmentAction } from '@flying-chess/game-core/types'
import type { BlockingOverlayState } from '../services/gameStateHealth'

export function useGameOverlays() {
  // 起飞惩罚显示状态
  const showTakeoffPunishmentDisplay = ref(false)
  const currentTakeoffPunishment = ref<PunishmentAction | null>(null)
  const currentTakeoffDiceValue = ref(1)
  const currentTakeoffExecutorIndex = ref(0)
  const currentTakeoffTarget = ref<Player | null>(null)
  const currentTakeoffTriggeringPlayer = ref<Player | null>(null)

  // 机关陷阱弹窗状态
  const showTrapDisplay = ref(false)
  const showTrapChoiceDisplay = ref(false)
  const currentTrapPunishment = ref<PunishmentAction | null>(null)
  const currentTrapDescription = ref<string>('')
  const currentTrapChoiceA = ref('')
  const currentTrapChoiceB = ref('')
  const currentTrapVariant = ref<string | undefined>()
  const currentTrapRouletteTarget = ref<Player | null>(null)

  // 问答 / 指令格弹窗
  const showQADisplay = ref(false)
  const currentQAQuestion = ref('')
  const showDareDisplay = ref(false)
  const currentDareInstruction = ref('')

  // 反弹效果弹窗状态
  const showBounceDisplay = ref(false)
  const bounceFromPosition = ref<number>(0)
  const bounceTargetPosition = ref<number>(0)
  const bounceFinalPosition = ref<number>(0)
  const bounceOverflowSteps = ref<number>(0)

  // 翻倍惩罚状态
  const showDoublePunishmentReveal = ref(false)
  const isDoublePunishment = ref(false)
  const pendingDoublePunishment = ref<PunishmentAction | null>(null)

  // 连锁惩罚状态
  const isChainPunishment = ref(false)
  const showChainPunishmentRoll = ref(false)

  // 求饶状态
  const showMercyDecision = ref(false)
  const mercyHalvedStrikes = ref(0)
  const mercySource = ref<'board' | 'takeoff'>('board')
  const mercyRequested = ref(false)
  const mercyExecutorPlayer = ref<Player | null>(null)
  const mercyTargetPlayer = ref<Player | null>(null)

  // 起飞失败过多救济弹窗状态
  const showTakeoffReliefDisplay = ref(false)
  const failedTakeoffCountForMessage = ref(0)

  // 胜利结算画面状态
  const showVictoryScreen = ref(false)

  // 重置所有弹窗与阻断层状态
  const resetOverlays = () => {
    showTakeoffPunishmentDisplay.value = false
    currentTakeoffPunishment.value = null
    currentTakeoffExecutorIndex.value = -1
    currentTakeoffTarget.value = null
    currentTakeoffTriggeringPlayer.value = null

    showTrapDisplay.value = false
    showTrapChoiceDisplay.value = false
    currentTrapPunishment.value = null
    currentTrapDescription.value = ''
    currentTrapChoiceA.value = ''
    currentTrapChoiceB.value = ''
    currentTrapVariant.value = undefined
    currentTrapRouletteTarget.value = null

    showQADisplay.value = false
    currentQAQuestion.value = ''

    showDareDisplay.value = false
    currentDareInstruction.value = ''

    showDoublePunishmentReveal.value = false
    isDoublePunishment.value = false
    pendingDoublePunishment.value = null

    showChainPunishmentRoll.value = false
    isChainPunishment.value = false

    showTakeoffReliefDisplay.value = false

    showBounceDisplay.value = false
    bounceFromPosition.value = 0
    bounceTargetPosition.value = 0
    bounceFinalPosition.value = 0
    bounceOverflowSteps.value = 0

    showVictoryScreen.value = false

    showMercyDecision.value = false
    mercyRequested.value = false
    mercyExecutorPlayer.value = null
    mercyTargetPlayer.value = null
  }

  // 聚合计算阻断状态
  const getBlockingOverlays = (
    sessionPaused: boolean,
    partyInteraction: boolean
  ): BlockingOverlayState => ({
    takeoffPunishment: showTakeoffPunishmentDisplay.value,
    trap:
      showTrapDisplay.value ||
      showTrapChoiceDisplay.value ||
      showQADisplay.value ||
      showDareDisplay.value,
    bounce: showBounceDisplay.value,
    takeoffRelief: showTakeoffReliefDisplay.value,
    doublePunishmentReveal: showDoublePunishmentReveal.value,
    chainPunishmentRoll: showChainPunishmentRoll.value,
    mercyDecision: showMercyDecision.value,
    sessionPaused,
    partyInteraction,
  })

  return {
    showTakeoffPunishmentDisplay,
    currentTakeoffPunishment,
    currentTakeoffDiceValue,
    currentTakeoffExecutorIndex,
    currentTakeoffTarget,
    currentTakeoffTriggeringPlayer,

    showTrapDisplay,
    showTrapChoiceDisplay,
    currentTrapPunishment,
    currentTrapDescription,
    currentTrapChoiceA,
    currentTrapChoiceB,
    currentTrapVariant,
    currentTrapRouletteTarget,

    showQADisplay,
    currentQAQuestion,
    showDareDisplay,
    currentDareInstruction,

    showBounceDisplay,
    bounceFromPosition,
    bounceTargetPosition,
    bounceFinalPosition,
    bounceOverflowSteps,

    showDoublePunishmentReveal,
    isDoublePunishment,
    pendingDoublePunishment,

    isChainPunishment,
    showChainPunishmentRoll,

    showMercyDecision,
    mercyHalvedStrikes,
    mercySource,
    mercyRequested,
    mercyExecutorPlayer,
    mercyTargetPlayer,

    showTakeoffReliefDisplay,
    failedTakeoffCountForMessage,

    showVictoryScreen,

    resetOverlays,
    getBlockingOverlays,
  }
}
