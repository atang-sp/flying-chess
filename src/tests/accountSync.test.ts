import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalProgress, recordLocalProgress } from '../services/localProgress'

const auth = vi.hoisted(() => ({ currentUser: { value: { id: 'A' } as { id: string } | null } }))
const server = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  error: false,
  conflict: false,
  sequence: 0,
  beforeRead: null as (() => void | Promise<void>) | null,
  beforeWrite: null as (() => void) | null,
}))
vi.mock('../composables/useAuth', () => ({ useAuth: () => auth }))
vi.mock('../services/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from(table: string) {
      let action = 'read'
      let payload: Record<string, unknown> = {}
      const filters: Record<string, string> = {}
      const execute = async () => {
        if (action === 'read' && server.beforeRead) {
          const hook = server.beforeRead
          server.beforeRead = null
          await hook()
        }
        if (server.error && action !== 'read')
          return { data: null, error: { message: 'Network unavailable' } }
        const user = String(payload.user_id ?? filters.user_id)
        const key = `${table}:${user}`
        if (auth.currentUser.value?.id !== user)
          return { data: null, error: { message: 'RLS denied' } }
        if (action === 'read')
          return { data: structuredClone(server.rows.get(key) ?? null), error: null }
        if (server.beforeWrite) {
          const hook = server.beforeWrite
          server.beforeWrite = null
          hook()
        }
        const old = server.rows.get(key)
        if (action === 'insert' && old) return { data: null, error: { code: '23505' } }
        if (action === 'update' && (old?.updated_at !== filters.updated_at || server.conflict)) {
          server.conflict = false
          return { data: null, error: null }
        }
        const row = { ...payload, user_id: user, updated_at: String(++server.sequence) }
        server.rows.set(key, structuredClone(row))
        return { data: row, error: null }
      }
      const query = {
        select() {
          return query
        },
        eq(key: string, value: string) {
          filters[key] = value
          return query
        },
        insert(value: Record<string, unknown>) {
          action = 'insert'
          payload = value
          return query
        },
        update(value: Record<string, unknown>) {
          action = 'update'
          payload = value
          return query
        },
        maybeSingle: execute,
        then(resolve: (value: Awaited<ReturnType<typeof execute>>) => unknown) {
          return execute().then(resolve)
        },
      }
      return query
    },
  },
}))

let values: Map<string, string>
let engine: typeof import('../services/syncEngine')
let cache: typeof import('../utils/cache')
let runtime: typeof import('../services/syncRuntime')
let accounts: typeof import('../services/accountStorage')
let replicas: typeof import('../services/progressReplica')

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
  })
  server.rows.clear()
  server.error = false
  server.conflict = false
  server.sequence = 0
  server.beforeRead = null
  server.beforeWrite = null
  auth.currentUser.value = { id: 'A' }
  cache = await import('../utils/cache')
  runtime = await import('../services/syncRuntime')
  accounts = await import('../services/accountStorage')
  replicas = await import('../services/progressReplica')
  engine = await import('../services/syncEngine')
  accounts.switchAccountStorage('A')
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const completedGame = () => recordLocalProgress(createLocalProgress(), { kind: 'game_completed' })

describe('account cloud synchronization', () => {
  it('keeps failed uploads pending and reports success only after retry', async () => {
    cache.saveGameMode('party')
    server.error = true
    expect(await engine.syncEngine.pullAndMerge()).toBe(false)
    expect(engine.syncStatus.value).toBe('error')
    expect(engine.lastSyncedAt.value).toBeNull()
    expect(runtime.readPending().settings).toBeGreaterThan(0)
    server.error = false
    await vi.advanceTimersByTimeAsync(1000)
    expect(engine.syncStatus.value).toBe('success')
    expect(runtime.readPending()).toEqual({})
  })

  it('uploads the complete newer local bundle instead of mixing in stale fields', async () => {
    const cloud = {
      ...engine.collectLocalSettings(),
      savedAt: 1,
      gameMode: 'classic',
      locale: 'en',
    }
    server.rows.set('user_configs:A', { settings: cloud, updated_at: 'old' })
    cache.saveGameMode('party')
    cache.saveLocalePreference('zh')
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadGameMode()).toBe('party')
    expect(cache.loadLocalePreference()).toBe('zh')
    expect(server.rows.get('user_configs:A')?.settings).toMatchObject({
      gameMode: 'party',
      locale: 'zh',
    })
  })

  it('applies a newer cloud bundle and notifies the current page', async () => {
    cache.saveGameMode('party')
    const revision = runtime.storageRevision.value
    server.rows.set('user_configs:A', {
      settings: {
        ...engine.collectLocalSettings(),
        gameMode: 'classic',
        locale: 'en',
        savedAt: Date.now() + 1000,
      },
      updated_at: 'new',
    })
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadGameMode()).toBe('classic')
    expect(cache.loadLocalePreference()).toBe('en')
    expect(runtime.storageRevision.value).toBeGreaterThan(revision)
  })

  it('does not acknowledge edits made while an upload is in flight', async () => {
    cache.saveGameMode('party')
    server.beforeWrite = () => cache.saveGameMode('classic')
    expect(await engine.syncEngine.pullAndMerge()).toBe(false)
    expect(runtime.readPending().settings).toBeGreaterThan(0)
    await engine.syncEngine.pullAndMerge()
    expect(server.rows.get('user_configs:A')?.settings).toMatchObject({ gameMode: 'classic' })
  })

  it('retries a compare-and-set conflict without overwriting the winning settings', async () => {
    server.rows.set('user_configs:A', {
      settings: { ...engine.collectLocalSettings(), savedAt: 1 },
      updated_at: 'old',
    })
    cache.saveGameMode('party')
    server.beforeWrite = () => {
      server.rows.set('user_configs:A', {
        settings: {
          ...engine.collectLocalSettings(),
          gameMode: 'classic',
          savedAt: Date.now() + 1000,
        },
        updated_at: 'winner',
      })
    }
    expect(await engine.syncEngine.pullAndMerge()).toBe(true)
    expect(cache.loadGameMode()).toBe('classic')
    expect(server.rows.get('user_configs:A')?.updated_at).toBe('winner')
  })

  it('preserves nested progress and player-only updates and deduplicates repeated uploads', async () => {
    const progress = recordLocalProgress(createLocalProgress(), {
      kind: 'punishment_completed',
      playerName: 'Alice',
      count: 0,
      variant: 'blindbox',
    })
    expect(cache.saveLocalProgress(progress)).toBe(true)
    await engine.syncEngine.pullAndMerge()
    await engine.syncEngine.pullAndMerge()
    const row = server.rows.get('game_progress:A')
    expect(row?.totals).toMatchObject({ variantCompletions: { blindbox: 1 } })
    expect(row?.shame_records).toHaveProperty('Alice')
  })

  it('adds independent device increments and retries progress conflicts', async () => {
    cache.saveLocalProgress(completedGame())
    await engine.syncEngine.pullAndMerge()
    const row = server.rows.get('game_progress:A')
    if (!row) throw new Error('Missing cloud progress')
    const metadata = (
      row.totals as { __replica: import('../services/progressReplica').ProgressReplica }
    ).__replica
    metadata.devices.other = completedGame()
    const other = replicas.replicaProgress(metadata)
    server.rows.set('game_progress:A', {
      ...row,
      totals: { ...other.totals, __replica: metadata },
      updated_at: 'other',
    })
    server.conflict = true
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(2)
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(2)
  })

  it('keeps a new progress event recorded during an upload', async () => {
    await engine.syncEngine.pullAndMerge()
    cache.saveLocalProgress(completedGame())
    // Settings are read-only, so this hook runs during the progress upload.
    server.beforeWrite = () =>
      cache.saveLocalProgress(
        recordLocalProgress(cache.loadLocalProgress(), { kind: 'game_completed' })
      )
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(2)
    expect(runtime.readPending().progress).toBeGreaterThan(0)
    await engine.syncEngine.pullAndMerge()
    expect(server.rows.get('game_progress:A')?.totals).toMatchObject({ completedGames: 2 })
  })

  it('never applies a delayed response from the previous account', async () => {
    cache.saveGameMode('party')
    server.beforeRead = () => {
      accounts.switchAccountStorage('B')
      auth.currentUser.value = { id: 'B' }
    }
    expect(await engine.syncEngine.pullAndMerge()).toBe(false)
    expect(cache.loadGameMode()).toBe('classic')
    expect(server.rows.has('user_configs:B')).toBe(false)
    accounts.switchAccountStorage('A')
    expect(cache.loadGameMode()).toBe('party')
    expect(runtime.readPending().settings).toBeGreaterThan(0)
  })

  it('restores pending uploads and synchronization time for each account', async () => {
    cache.saveGameMode('party')
    await engine.syncEngine.pullAndMerge()
    const syncedAt = engine.lastSyncedAt.value
    cache.saveGameMode('classic')
    accounts.switchAccountStorage('B')
    expect(engine.lastSyncedAt.value).toBeNull()
    expect(runtime.readPending()).toEqual({})
    accounts.switchAccountStorage('A')
    expect(engine.lastSyncedAt.value).toBe(syncedAt)
    expect(runtime.readPending().settings).toBeGreaterThan(0)
  })

  it('preserves guest data and imports only on explicit request', async () => {
    accounts.switchAccountStorage('guest')
    cache.saveLocalProgress(completedGame())
    cache.saveGameMode('party')
    accounts.switchAccountStorage('A')
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(0)
    await engine.syncEngine.importGuestData()
    await engine.syncEngine.importGuestData()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(1)
    accounts.switchAccountStorage('guest')
    expect(cache.loadLocalProgress().totals.completedGames).toBe(1)
  })

  it('rejects malformed cloud metadata without announcing successful synchronization', async () => {
    server.rows.set('game_progress:A', {
      totals: { __replica: { version: 2, baseline: {} } },
      shame_records: {},
      updated_at: 'broken',
    })
    expect(await engine.syncEngine.pullAndMerge()).toBe(false)
    expect(engine.syncStatus.value).toBe('error')
    expect(cache.loadLocalProgress()).toEqual(createLocalProgress())
  })

  it('does not double-count a legacy client overwriting device metadata', async () => {
    cache.saveLocalProgress(completedGame())
    await engine.syncEngine.pullAndMerge()
    server.rows.set('game_progress:A', {
      totals: { ...completedGame().totals, completedGames: 2 },
      shame_records: {},
      updated_at: 'legacy-overwrite',
    })
    expect(await engine.syncEngine.pullAndMerge()).toBe(false)
    expect(engine.syncError.value).toContain('Legacy progress snapshot')
    expect(cache.loadLocalProgress().totals.completedGames).toBe(1)
    expect(server.rows.get('game_progress:A')?.totals).toMatchObject({ completedGames: 2 })
  })

  it('preserves migrated historical totals and adds only newly recorded events', async () => {
    server.rows.set('game_progress:A', {
      totals: { ...completedGame().totals, completedGames: 5 },
      shame_records: {},
      updated_at: 'legacy',
    })
    await engine.syncEngine.pullAndMerge()
    cache.saveLocalProgress(
      recordLocalProgress(cache.loadLocalProgress(), { kind: 'game_completed' })
    )
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(6)
    await engine.syncEngine.pullAndMerge()
    expect(cache.loadLocalProgress().totals.completedGames).toBe(6)
  })

  it('accepts PostgreSQL JSONB reordering of nested object fields', async () => {
    cache.saveLocalProgress(
      recordLocalProgress(createLocalProgress(), {
        kind: 'punishment_completed',
        playerName: 'Alice',
        count: 2,
        variant: 'deferred',
      })
    )
    await engine.syncEngine.pullAndMerge()
    const reorder = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(reorder)
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>
        return Object.fromEntries(
          Object.keys(record)
            .sort()
            .reverse()
            .map(key => [key, reorder(record[key])])
        )
      }
      return value
    }
    const row = server.rows.get('game_progress:A')
    if (!row) throw new Error('Missing progress')
    server.rows.set('game_progress:A', reorder(row) as Record<string, unknown>)
    expect(await engine.syncEngine.pullAndMerge()).toBe(true)
    expect(cache.loadLocalProgress().players.Alice.punishmentCount).toBe(2)
  })
})
