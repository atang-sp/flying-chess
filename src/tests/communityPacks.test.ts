import { describe, expect, it, vi } from 'vitest'
import {
  loadCommunityCatalog,
  loadRemoteCommunityPack,
  validateCommunityPack,
} from '../services/communityPacks'
import { DEFAULT_PARTY_EVENT_DECK } from '../services/partyEvents'

const pack = {
  schemaVersion: 1,
  id: 'icebreaker-plus',
  title: '破冰加量包',
  description: '适合新朋友的轻量事件卡。',
  tags: ['破冰局', '轻度'],
  rating: 4.8,
  eventDeck: DEFAULT_PARTY_EVENT_DECK.slice(0, 2),
}

describe('静态社区配置包', () => {
  it('校验配置包元数据、评分标签和至少一类可应用内容', () => {
    expect(validateCommunityPack(pack)).toEqual({ ok: true })
    expect(validateCommunityPack({ ...pack, rating: 6 })).toMatchObject({ ok: false })
    expect(validateCommunityPack({ ...pack, eventDeck: [] })).toMatchObject({ ok: false })
  })

  it('从 HTTPS 或同源地址加载受大小限制的远程配置', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(pack), {
          status: 200,
          headers: { 'content-length': String(JSON.stringify(pack).length) },
        })
    )

    await expect(
      loadRemoteCommunityPack('https://example.com/pack.json', fetcher)
    ).resolves.toMatchObject({ id: 'icebreaker-plus' })
    await expect(loadRemoteCommunityPack('javascript:alert(1)', fetcher)).rejects.toThrow(
      '只支持 HTTP(S) 配置地址'
    )
  })

  it('目录索引只接受合法条目并保留远程包地址', async () => {
    const catalog = [{ ...pack, packUrl: '/community/packs/icebreaker-plus.json' }]
    const fetcher = vi.fn(async () => new Response(JSON.stringify(catalog), { status: 200 }))

    await expect(loadCommunityCatalog('/community/index.json', fetcher)).resolves.toEqual(catalog)
  })
})
