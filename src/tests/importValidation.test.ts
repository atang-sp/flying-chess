import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizePunishmentConfig } from '@flying-chess/game-core/config'
import { collectExportData, importFromJson, validateImportData } from '../utils/export'

const createValidImport = () => ({
  version: '1.0.0',
  exportedAt: '2026-07-11T00:00:00.000Z',
  gameTitle: '飞行棋配置',
  data: {
    playerSettings: {
      playerCount: 2,
      playerNames: ['玩家1', '玩家2'],
    },
    punishmentConfig: {
      tools: {
        手掌: { name: '手掌', intensity: 2, ratio: 100 },
      },
      bodyParts: {
        手心: { name: '手心', sensitivity: 3, ratio: 100 },
      },
      positions: {
        站立: { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
      },
      minStrikes: 5,
      maxStrikes: 30,
      step: 5,
      maxTakeoffFailures: 5,
    },
    boardConfig: {
      punishmentCells: 28,
      bonusCells: 1,
      reverseCells: 2,
      restCells: 1,
      restartCells: 4,
      trapCells: 2,
      totalCells: 40,
    },
    trapConfig: [{ name: '停留', description: '停留一分钟' }],
  },
})

const cloneValidImport = () => structuredClone(createValidImport())
type ImportFixture = ReturnType<typeof createValidImport>
type FixtureMutation = (data: ImportFixture) => void

const invalidPunishmentMutations: ReadonlyArray<readonly [string, FixtureMutation]> = [
  ['工具强度', data => void (data.data.punishmentConfig.tools.手掌.intensity = 0)],
  ['部位耐受度', data => void (data.data.punishmentConfig.bodyParts.手心.sensitivity = 11)],
  ['工具比例', data => void (data.data.punishmentConfig.tools.手掌.ratio = -1)],
  ['姿势比例', data => void (data.data.punishmentConfig.positions.站立.ratio = 101)],
  ['最小次数', data => void (data.data.punishmentConfig.minStrikes = 0)],
  ['最大次数', data => void (data.data.punishmentConfig.maxStrikes = 101)],
  ['次数顺序', data => void (data.data.punishmentConfig.minStrikes = 31)],
  ['次数步长', data => void (data.data.punishmentConfig.step = 0)],
  ['起飞失败阈值', data => void (data.data.punishmentConfig.maxTakeoffFailures = 11)],
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('导入配置校验', () => {
  it('接受当前记录格式', () => {
    expect(validateImportData(createValidImport()).isValid).toBe(true)
  })

  it('接受受支持的旧数组格式', () => {
    const data = cloneValidImport()
    data.data.punishmentConfig.tools = [{ name: '手掌', intensity: 2, ratio: 100 }] as never
    data.data.punishmentConfig.bodyParts = [{ name: '手心', sensitivity: 3, ratio: 100 }] as never
    data.data.punishmentConfig.positions = [
      { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
    ] as never

    expect(validateImportData(data).isValid).toBe(true)
  })

  it.each([19, 101])('拒绝总格子数 %s', totalCells => {
    const data = cloneValidImport()
    data.data.boardConfig.totalCells = totalCells

    expect(validateImportData(data).isValid).toBe(false)
  })

  it('拒绝占用起点或终点的格子数量', () => {
    const data = cloneValidImport()
    data.data.boardConfig.punishmentCells = 30

    expect(validateImportData(data).isValid).toBe(false)
  })

  it.each(['tools', 'bodyParts', 'positions'] as const)('拒绝空的 %s 配置', field => {
    const data = cloneValidImport()
    ;(data.data.punishmentConfig as unknown as Record<string, unknown>)[field] = {}

    expect(validateImportData(data).isValid).toBe(false)
  })

  it('拒绝空机关配置', () => {
    const data = cloneValidImport()
    data.data.trapConfig = []

    expect(validateImportData(data).isValid).toBe(false)
  })

  it.each(invalidPunishmentMutations)('拒绝超出范围的%s', (_label, mutate) => {
    const data = cloneValidImport()
    mutate(data)

    expect(validateImportData(data).isValid).toBe(false)
  })

  it('拒绝姿势引用不存在的部位', () => {
    const data = cloneValidImport()
    data.data.punishmentConfig.positions.站立.compatibleBodyParts = ['不存在的部位']

    expect(validateImportData(data).isValid).toBe(false)
  })

  it('将旧配置中缺少兼容部位的自定义姿势归一化为不限制部位', () => {
    const data = cloneValidImport()
    const positions = data.data.punishmentConfig.positions as Record<
      string,
      { name: string; ratio: number; compatibleBodyParts?: string[] }
    >
    positions.自定义姿势 = {
      name: '自定义姿势',
      ratio: 10,
    }

    expect(validateImportData(data).isValid).toBe(true)
    expect(
      normalizePunishmentConfig(data.data.punishmentConfig).positions.自定义姿势
        ?.compatibleBodyParts
    ).toEqual([])
  })

  it.each(['tools', 'bodyParts', 'positions'] as const)('拒绝所有 %s 权重均为零', field => {
    const data = cloneValidImport()
    const entries = data.data.punishmentConfig[field] as Record<string, { ratio: number }>
    Object.values(entries).forEach(entry => {
      entry.ratio = 0
    })

    expect(validateImportData(data).isValid).toBe(false)
  })

  it.each(['tools', 'bodyParts', 'positions'] as const)(
    '拒绝旧数组格式中所有 %s 权重均为零',
    field => {
      const data = cloneValidImport()
      data.data.punishmentConfig.tools = [{ name: '手掌', intensity: 2, ratio: 100 }] as never
      data.data.punishmentConfig.bodyParts = [{ name: '手心', sensitivity: 3, ratio: 100 }] as never
      data.data.punishmentConfig.positions = [
        { name: '站立', ratio: 100, compatibleBodyParts: ['手心'] },
      ] as never
      const entries = data.data.punishmentConfig[field] as unknown as Array<{ ratio: number }>
      entries.forEach(entry => {
        entry.ratio = 0
      })

      expect(validateImportData(data).isValid).toBe(false)
    }
  )

  it('无效数据不会改写现有本地存储', () => {
    const values = new Map<string, string>([
      ['ludo_game_config', 'existing-config'],
      ['ludo_player_settings', 'existing-players'],
      ['flying-chess-config-backup', 'existing-backup'],
    ])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const before = [...values.entries()]
    const data = cloneValidImport()
    data.data.boardConfig.totalCells = 19
    const beforeApply = vi.fn()

    const result = importFromJson(JSON.stringify(data), {}, beforeApply)

    expect(result.success).toBe(false)
    expect(beforeApply).not.toHaveBeenCalled()
    expect([...values.entries()]).toEqual(before)
  })

  it('即使调用方关闭校验选项，无效数据仍不会写入本地存储', () => {
    const values = new Map<string, string>([
      ['ludo_game_config', 'existing-config'],
      ['ludo_player_settings', 'existing-players'],
      ['flying-chess-config-backup', 'existing-backup'],
    ])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const before = [...values.entries()]
    const data = cloneValidImport()
    data.data.boardConfig.totalCells = 19

    const result = importFromJson(JSON.stringify(data), { validateData: false })

    expect(result.success).toBe(false)
    expect([...values.entries()]).toEqual(before)
  })

  it('校验通过后先结束旧局，再写入新配置', () => {
    const events: string[] = []
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        events.push(`persist:${key}`)
        values.set(key, value)
      },
      removeItem: (key: string) => values.delete(key),
    })

    const result = importFromJson(JSON.stringify(createValidImport()), {}, () => {
      events.push('end-active-session')
    })

    expect(result.success).toBe(true)
    expect(events[0]).toBe('end-active-session')
    expect(events.some(event => event.startsWith('persist:'))).toBe(true)
  })

  it('拒绝只包含不可恢复棋盘布局的空操作导入', () => {
    const data = {
      version: '1.0.0',
      exportedAt: '2026-08-07T00:00:00.000Z',
      gameTitle: '飞行棋配置',
      data: {
        boardContent: {
          seed: 'legacy-snapshot',
          generatedAt: Date.now(),
          board: [{ id: 1, position: 1, type: 'start', players: [] }],
        },
      },
    }

    const result = validateImportData(data)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('data 至少需要包含一个可导入的配置项')
  })

  it('公共导出入口忽略旧调用方请求的不可恢复棋盘布局', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    const result = Reflect.apply(collectExportData, undefined, [
      {
        playerSettings: false,
        punishmentConfig: false,
        boardConfig: false,
        trapConfig: false,
        boardContent: true,
      },
      [{ id: 1, position: 1, type: 'start', players: [] }],
    ])

    expect(result.data).not.toHaveProperty('boardContent')
  })

  it('明确告知旧文件中的棋盘布局未被恢复', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const data = cloneValidImport()
    ;(data.data as Record<string, unknown>).boardContent = {
      seed: 'legacy-snapshot',
      generatedAt: Date.now(),
      board: [{ id: 1, position: 1, type: 'start', players: [] }],
    }

    const result = importFromJson(JSON.stringify(data))

    expect(result.success).toBe(true)
    expect(result.warnings).toContain(
      '当前版本暂不支持恢复棋盘布局，该部分已跳过；其他配置已正常导入'
    )
    expect(result.warnings?.join('')).not.toContain('棋盘布局数据已导入')
  })
})
