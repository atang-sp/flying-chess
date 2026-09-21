import { describe, expect, it } from 'vitest'
import { useGameOverlays } from '../composables/useGameOverlays'

describe('游戏浮层状态管理器 (useGameOverlays)', () => {
  it('初始化时所有浮层默认关闭且计数为0', () => {
    const overlays = useGameOverlays()

    expect(overlays.showTakeoffPunishmentDisplay.value).toBe(false)
    expect(overlays.showTrapDisplay.value).toBe(false)
    expect(overlays.showTrapChoiceDisplay.value).toBe(false)
    expect(overlays.showQADisplay.value).toBe(false)
    expect(overlays.showDareDisplay.value).toBe(false)
    expect(overlays.showBounceDisplay.value).toBe(false)
    expect(overlays.showDoublePunishmentReveal.value).toBe(false)
    expect(overlays.showChainPunishmentRoll.value).toBe(false)
    expect(overlays.showMercyDecision.value).toBe(false)
    expect(overlays.showTakeoffReliefDisplay.value).toBe(false)
    expect(overlays.showVictoryScreen.value).toBe(false)
    expect(overlays.isChainPunishment.value).toBe(false)
    expect(overlays.isDoublePunishment.value).toBe(false)
    expect(overlays.mercyRequested.value).toBe(false)

    const blocking = overlays.getBlockingOverlays(false, false)
    expect(Object.values(blocking).some(Boolean)).toBe(false)
  })

  it('正确反映各个浮层的阻断状态 (getBlockingOverlays)', () => {
    const overlays = useGameOverlays()

    overlays.showBounceDisplay.value = true
    expect(overlays.getBlockingOverlays(false, false).bounce).toBe(true)

    overlays.showTrapChoiceDisplay.value = true
    expect(overlays.getBlockingOverlays(false, false).trap).toBe(true)
    overlays.showTrapChoiceDisplay.value = false

    overlays.showQADisplay.value = true
    expect(overlays.getBlockingOverlays(false, false).trap).toBe(true)
    overlays.showQADisplay.value = false

    overlays.showDareDisplay.value = true
    expect(overlays.getBlockingOverlays(false, false).trap).toBe(true)
    overlays.showDareDisplay.value = false

    expect(overlays.getBlockingOverlays(true, false).sessionPaused).toBe(true)
    expect(overlays.getBlockingOverlays(false, true).partyInteraction).toBe(true)
  })

  it('resetOverlays 能一次性清空所有弹窗与阻断层状态', () => {
    const overlays = useGameOverlays()

    overlays.showTakeoffPunishmentDisplay.value = true
    overlays.showTrapDisplay.value = true
    overlays.showBounceDisplay.value = true
    overlays.bounceOverflowSteps.value = 3
    overlays.showMercyDecision.value = true
    overlays.mercyRequested.value = true
    overlays.isChainPunishment.value = true
    overlays.showVictoryScreen.value = true

    overlays.resetOverlays()

    expect(overlays.showTakeoffPunishmentDisplay.value).toBe(false)
    expect(overlays.showTrapDisplay.value).toBe(false)
    expect(overlays.showBounceDisplay.value).toBe(false)
    expect(overlays.bounceOverflowSteps.value).toBe(0)
    expect(overlays.showMercyDecision.value).toBe(false)
    expect(overlays.mercyRequested.value).toBe(false)
    expect(overlays.isChainPunishment.value).toBe(false)
    expect(overlays.showVictoryScreen.value).toBe(false)

    const blocking = overlays.getBlockingOverlays(false, false)
    expect(Object.values(blocking).some(Boolean)).toBe(false)
  })
})
