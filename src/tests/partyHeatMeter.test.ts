import { renderToString } from '@vue/server-renderer'
import { createSSRApp } from 'vue'
import { describe, expect, it } from 'vitest'
import PartyHeatMeter from '../components/PartyHeatMeter.vue'

describe('PartyHeatMeter', () => {
  it('renders the three thresholds, stage, contribution, and progressbar aria values', async () => {
    const html = await renderToString(
      createSSRApp(PartyHeatMeter, {
        heat: 42,
        act: 'heating',
        currentPlayerContribution: 17,
        rewardNotice: '玩家二获得 1 枚筹码',
      })
    )

    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).toContain('aria-valuenow="42"')
    expect(html).toContain('42 / 100')
    expect(html).toContain('升温阶段')
    expect(html).toContain('距离终局还差 28')
    expect(html).toContain('当前玩家贡献 17')
    expect(html).toMatch(/>\s*30\s*</)
    expect(html).toMatch(/>\s*70\s*</)
    expect(html).toMatch(/>\s*100\s*</)
    expect(html).toContain('玩家二获得 1 枚筹码')
  })

  it('announces the round-boundary ending state at maximum heat', async () => {
    const html = await renderToString(
      createSSRApp(PartyHeatMeter, {
        heat: 100,
        act: 'finale',
        currentPlayerContribution: 50,
        heatLimitPending: true,
      })
    )

    expect(html).toContain('当前完整轮次结束后进入结算')
  })
})
