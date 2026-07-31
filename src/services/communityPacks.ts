import type { VictoryConfig } from '../types/game'
import { normalizeVictoryConfig } from './victorySettlement'
import { validatePartyEventDeck, type PartyEventCard } from './partyEvents'
import { validatePartyStudioConfig, type PartyStudioConfig } from './partyStudio'

const MAX_REMOTE_PACK_BYTES = 500_000
const MAX_CATALOG_ENTRIES = 100

export interface CommunityPackMetadata {
  readonly schemaVersion: 1
  readonly id: string
  readonly title: string
  readonly description: string
  readonly tags: readonly string[]
  readonly rating: number
}

export interface CommunityPack extends CommunityPackMetadata {
  readonly eventDeck?: readonly PartyEventCard[]
  readonly victoryConfig?: VictoryConfig
  readonly studioConfig?: PartyStudioConfig
}

export interface CommunityCatalogEntry extends CommunityPackMetadata {
  readonly packUrl: string
}

export interface CommunityPackValidation {
  readonly ok: boolean
  readonly error?: string
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const validateMetadata = (value: unknown): CommunityPackValidation => {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    return { ok: false, error: '社区配置包 schemaVersion 必须为 1' }
  }
  for (const field of ['id', 'title', 'description'] as const) {
    const content = value[field]
    if (typeof content !== 'string' || !content.trim() || content.length > 240) {
      return { ok: false, error: `社区配置包 ${field} 无效` }
    }
  }
  if (
    !Array.isArray(value.tags) ||
    value.tags.length === 0 ||
    value.tags.length > 8 ||
    value.tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 20)
  ) {
    return { ok: false, error: '社区配置包标签必须包含 1–8 个短标签' }
  }
  if (typeof value.rating !== 'number' || value.rating < 0 || value.rating > 5) {
    return { ok: false, error: '社区配置包评分必须为 0–5' }
  }
  return { ok: true }
}

export function validateCommunityPack(value: unknown): CommunityPackValidation {
  const metadata = validateMetadata(value)
  if (!metadata.ok) return metadata
  const candidate = value as Record<string, unknown>
  let contentCount = 0
  if (candidate.eventDeck !== undefined) {
    const validation = validatePartyEventDeck(candidate.eventDeck)
    if (!validation.ok) return validation
    contentCount += 1
  }
  if (candidate.victoryConfig !== undefined) {
    if (!isRecord(candidate.victoryConfig)) {
      return { ok: false, error: '终局配置必须是对象' }
    }
    const normalized = normalizeVictoryConfig(candidate.victoryConfig)
    const victory = candidate.victoryConfig
    if (
      normalized.actionText !== victory.actionText ||
      normalized.baseCount !== victory.baseCount ||
      normalized.countUnit !== victory.countUnit ||
      normalized.loserGradientEnabled !== victory.loserGradientEnabled ||
      normalized.gradientStep !== victory.gradientStep
    ) {
      return { ok: false, error: '终局配置包含无效字段或数值' }
    }
    contentCount += 1
  }
  if (candidate.studioConfig !== undefined) {
    const validation = validatePartyStudioConfig(candidate.studioConfig)
    if (!validation.ok) return validation
    contentCount += 1
  }
  return contentCount > 0
    ? { ok: true }
    : { ok: false, error: '社区配置包至少需要事件卡、终局配置或场景配置' }
}

const parseRemoteUrl = (value: string): URL => {
  const baseOrigin = globalThis.location?.origin ?? 'http://localhost'
  const parsed = new URL(value, baseOrigin)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只支持 HTTP(S) 配置地址')
  }
  return parsed
}

const fetchJsonWithLimit = async (
  url: string,
  fetcher: Fetcher,
  timeoutMs = 8_000
): Promise<unknown> => {
  const parsed = parseRemoteUrl(url)
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(parsed, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok) throw new Error(`远程配置请求失败（HTTP ${response.status}）`)
    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_REMOTE_PACK_BYTES) throw new Error('远程配置超过 500KB 上限')

    if (!response.body) {
      const text = await response.text()
      if (new TextEncoder().encode(text).length > MAX_REMOTE_PACK_BYTES) {
        throw new Error('远程配置超过 500KB 上限')
      }
      return JSON.parse(text) as unknown
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let receivedBytes = 0
    let text = ''
    let streamComplete = false
    try {
      while (!streamComplete) {
        const { done, value } = await reader.read()
        streamComplete = done
        if (done) continue
        receivedBytes += value.byteLength
        if (receivedBytes > MAX_REMOTE_PACK_BYTES) {
          await reader.cancel('远程配置超过大小上限')
          throw new Error('远程配置超过 500KB 上限')
        }
        text += decoder.decode(value, { stream: true })
      }
      text += decoder.decode()
    } finally {
      reader.releaseLock()
    }
    return JSON.parse(text) as unknown
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export async function loadRemoteCommunityPack(
  url: string,
  fetcher: Fetcher = fetch
): Promise<CommunityPack> {
  const value = await fetchJsonWithLimit(url, fetcher)
  const validation = validateCommunityPack(value)
  if (!validation.ok) throw new Error(validation.error ?? '远程社区配置无效')
  return value as CommunityPack
}

export async function loadCommunityCatalog(
  url: string,
  fetcher: Fetcher = fetch
): Promise<readonly CommunityCatalogEntry[]> {
  const value = await fetchJsonWithLimit(url, fetcher)
  if (!Array.isArray(value) || value.length > MAX_CATALOG_ENTRIES) {
    throw new Error('社区目录必须为不超过 100 项的数组')
  }
  for (const entry of value) {
    const metadata = validateMetadata(entry)
    if (!metadata.ok || !isRecord(entry) || typeof entry.packUrl !== 'string') {
      throw new Error(metadata.error ?? '社区目录条目无效')
    }
    parseRemoteUrl(entry.packUrl)
  }
  return value as readonly CommunityCatalogEntry[]
}
