import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutoGuideScheduler } from '../services/autoGuideScheduler'

describe('automatic guide scheduling', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function setup() {
    let context = 'intro:config'
    let enabled = true
    let active = false
    const shown = new Set<string>()
    const start = vi.fn(() => true)
    const scheduler = createAutoGuideScheduler({
      context: () => context,
      canStart: page => enabled && !active && !shown.has(page),
      start,
      markShown: page => shown.add(page),
    })
    return {
      scheduler,
      start,
      shown,
      setContext: (value: string) => (context = value),
      disable: () => (enabled = false),
      setActive: () => (active = true),
    }
  }

  it('cancels pending work and never records a cancelled guide', () => {
    const { scheduler, start, shown } = setup()
    scheduler.schedule('intro')
    scheduler.cancel()
    vi.runAllTimers()
    expect(start).not.toHaveBeenCalled()
    expect(shown.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rechecks the switch, current context and active guide at execution time', () => {
    for (const invalidate of ['disable', 'context', 'active']) {
      const state = setup()
      state.scheduler.schedule('intro')
      if (invalidate === 'disable') state.disable()
      if (invalidate === 'context') state.setContext('settings:confirm')
      if (invalidate === 'active') state.setActive()
      vi.runAllTimers()
      expect(state.start).not.toHaveBeenCalled()
      expect(state.shown.size).toBe(0)
    }
  })

  it('replaces tasks without losing the reference and marks only a successful start', () => {
    const { scheduler, start, shown, setContext } = setup()
    scheduler.schedule('intro')
    vi.advanceTimersByTime(500)
    setContext('settings:confirm')
    scheduler.schedule('punishment_confirmation')
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(799)
    expect(start).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(start).toHaveBeenCalledExactlyOnceWith('punishment_confirmation')
    expect([...shown]).toEqual(['punishment_confirmation'])
    scheduler.schedule('punishment_confirmation')
    expect(vi.getTimerCount()).toBe(0)
    start.mockReturnValue(false)
    scheduler.schedule('settings')
    vi.runAllTimers()
    expect(shown.has('settings')).toBe(false)
  })

  it('disposal rejects late nextTick requests as well as existing timers', () => {
    const { scheduler, start } = setup()
    scheduler.schedule('intro')
    scheduler.dispose()
    scheduler.schedule('intro')
    vi.runAllTimers()
    expect(start).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
