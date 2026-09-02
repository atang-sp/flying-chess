import { describe, expect, it } from 'vitest'
import {
  applyBoardConfigOverlay,
  createCompatiblePunishmentAction,
  createModeConfig,
  cryptoRandomInt,
  createSharedBoard,
  createStandardConfigSnapshot,
  GAME_CONFIG,
  MODE_POLICIES,
  normalizeConfigSnapshot,
  inspectPunishmentConfig,
  projectPublicConfig,
  serializeConfigSnapshot,
  validateBoardConfig,
  validatePunishmentConfig,
  validateConfigSnapshot,
  type BoardRandomSource,
  type ConfigSnapshot,
  type PunishmentConfig,
} from './sharedConfig'

const deterministicRandom = (value = 0): BoardRandomSource => ({
  randomInt: (minimum, maximum) => Math.min(maximum, Math.max(minimum, value)),
  choice: entries => {
    const selected = entries[value % entries.length]
    if (selected === undefined) throw new Error('test random source received an empty collection')
    return selected
  },
})

describe('shared game configuration contract', () => {
  it('对小数权重使用比例不变的连续区间选择', () => {
    const lowQuantile: BoardRandomSource = {
      randomInt: minimum => minimum,
      random: () => 0,
      choice: entries => {
        const selected = entries[0]
        if (selected === undefined) throw new Error('expected a weighted candidate')
        return selected
      },
    }
    const highQuantile: BoardRandomSource = {
      randomInt: (_minimum, maximum) => maximum,
      random: () => 1 - Number.EPSILON,
      choice: entries => {
        const selected = entries[entries.length - 1]
        if (selected === undefined) throw new Error('expected a weighted candidate')
        return selected
      },
    }

    for (const scale of [0.1, 1, 50]) {
      const config: PunishmentConfig = {
        tools: {
          A: { name: 'A', intensity: 1, ratio: scale },
          B: { name: 'B', intensity: 1, ratio: scale },
        },
        bodyParts: { C: { name: 'C', sensitivity: 1, ratio: scale } },
        positions: { D: { name: 'D', ratio: scale, compatibleBodyParts: [] } },
        minStrikes: 1,
        maxStrikes: 1,
        step: 1,
        maxTakeoffFailures: 1,
        doublePunishmentChance: 0,
      }

      expect(createCompatiblePunishmentAction(config, lowQuantile).tool.name).toBe('A')
      expect(createCompatiblePunishmentAction(config, highQuantile).tool.name).toBe('B')
    }
  })

  it('拒绝各分类分别启用但没有完整兼容组合的惩罚配置', () => {
    const config: PunishmentConfig = {
      tools: {
        重工具: { name: '重工具', intensity: 8, ratio: 100 },
      },
      bodyParts: {
        强部位: { name: '强部位', sensitivity: 8, ratio: 100 },
        弱部位: { name: '弱部位', sensitivity: 1, ratio: 0 },
      },
      positions: {
        限定姿势: { name: '限定姿势', ratio: 100, compatibleBodyParts: ['弱部位'] },
      },
      minStrikes: 1,
      maxStrikes: 5,
      step: 1,
      maxTakeoffFailures: 1,
      doublePunishmentChance: 0,
    }

    expect(validatePunishmentConfig(config)).toBe(false)
    expect(inspectPunishmentConfig(config)).toMatchObject({
      isValid: false,
      issues: [{ code: 'NO_COMPATIBLE_COMBINATION' }],
    })
  })

  it('根据幕约束拒绝该阶段无法生成的惩罚配置', () => {
    const config: PunishmentConfig = {
      tools: { 中强度: { name: '中强度', intensity: 5, ratio: 100 } },
      bodyParts: { 可承受: { name: '可承受', sensitivity: 5, ratio: 100 } },
      positions: { 任意: { name: '任意', ratio: 100, compatibleBodyParts: [] } },
      minStrikes: 5,
      maxStrikes: 10,
      step: 5,
      maxTakeoffFailures: 1,
      doublePunishmentChance: 0,
    }
    const party = createModeConfig('party')
    party.punishmentConfig = config

    expect(validatePunishmentConfig(config)).toBe(true)
    expect(inspectPunishmentConfig(config, { maxToolIntensity: 4 })).toMatchObject({
      isValid: false,
      issues: [{ code: 'NO_COMPATIBLE_COMBINATION' }],
    })
    expect(validateConfigSnapshot(party)).toBe(false)
  })

  it('拒绝在惩罚次数区间内无法落点的步长', () => {
    const config: PunishmentConfig = {
      tools: { A: { name: 'A', intensity: 1, ratio: 1 } },
      bodyParts: { B: { name: 'B', sensitivity: 1, ratio: 1 } },
      positions: { C: { name: 'C', ratio: 1, compatibleBodyParts: [] } },
      minStrikes: 2,
      maxStrikes: 3,
      step: 4,
      maxTakeoffFailures: 1,
      doublePunishmentChance: 0,
    }

    expect(validatePunishmentConfig(config)).toBe(false)
    expect(inspectPunishmentConfig(config)).toMatchObject({
      isValid: false,
      issues: [{ code: 'INVALID_STRIKE_RANGE' }],
    })
  })

  it('rejects uint32 tail samples so bounded random integers stay uniform', () => {
    const samples = [0xffff_ffff, 5]
    let calls = 0
    const source = {
      getRandomValues(values: Uint32Array) {
        values[0] = samples[calls] ?? 0
        calls += 1
        return values
      },
    }

    expect(cryptoRandomInt(1, 6, source)).toBe(6)
    expect(calls).toBe(2)
  })

  it('derives local and online heating snapshots from the effective standard snapshot', () => {
    const standard = createStandardConfigSnapshot({
      boardConfig: { totalCells: 40 },
      punishmentConfig: {
        minStrikes: 8,
        maxStrikes: 16,
        step: 4,
      },
    })
    const local = createModeConfig('party', standard)
    const online = createModeConfig('online_party', standard)

    expect(local.punishmentConfig.minStrikes).toBe(8)
    expect(local.punishmentConfig.maxStrikes).toBe(16)
    expect(local.punishmentConfig).not.toBe(standard.punishmentConfig)
    expect(local.boardConfig).not.toBe(standard.boardConfig)
    expect(online.boardConfig).toEqual(local.boardConfig)
    expect(online.punishmentConfig).toEqual(local.punishmentConfig)

    const localHand = local.punishmentConfig.tools['手掌']
    const standardHand = standard.punishmentConfig.tools['手掌']
    if (!localHand || !standardHand) throw new Error('expected standard hand punishment tool')
    localHand.ratio = 0
    local.boardConfig.totalCells = 60
    expect(standardHand.ratio).toBeGreaterThan(0)
    expect(standard.boardConfig.totalCells).toBe(40)
  })

  it('内置场景覆盖格子构成时保留用户选择的 100 格棋盘', () => {
    const base = {
      ...createStandardConfigSnapshot().boardConfig,
      totalCells: 100,
    }
    const scene = applyBoardConfigOverlay(base, {
      ...GAME_CONFIG.PARTY_SCENE_PRESETS.icebreaker.boardConfig,
      totalCells: base.totalCells,
    })

    expect(scene.totalCells).toBe(100)
    expect(validateBoardConfig(scene)).toBe(true)
    expect(createSharedBoard({ ...createModeConfig('party'), boardConfig: scene })).toHaveLength(
      100
    )
  })

  it('缩小棋盘时按容量压缩格子且不凭空添加可选字段', () => {
    const resized = applyBoardConfigOverlay(createStandardConfigSnapshot().boardConfig, {
      totalCells: 20,
    })
    const assigned = [
      resized.punishmentCells,
      resized.chainPunishmentCells,
      resized.bonusCells,
      resized.reverseCells,
      resized.restCells,
      resized.restartCells,
      resized.trapCells,
    ].reduce((sum, count) => sum + count, 0)

    expect(resized.totalCells).toBe(20)
    expect(assigned).toBe(18)
    expect(resized).not.toHaveProperty('qaCells')
    expect(resized).not.toHaveProperty('dareCells')
    expect(validateBoardConfig(resized)).toBe(true)
  })

  it('完整惩罚分类覆盖会保留自定义条目且不重新混入默认条目', () => {
    const standard = createStandardConfigSnapshot({
      punishmentConfig: {
        tools: {
          自定义工具: { name: '自定义工具', intensity: 4, ratio: 0.5 },
        },
        bodyParts: {
          自定义部位: { name: '自定义部位', sensitivity: 4, ratio: 0.5 },
        },
        positions: {
          自定义姿势: {
            name: '自定义姿势',
            ratio: 0.5,
            compatibleBodyParts: ['自定义部位'],
          },
        },
      },
    })
    const party = createModeConfig('party', standard)

    expect(Object.keys(standard.punishmentConfig.tools)).toEqual(['自定义工具'])
    expect(Object.keys(standard.punishmentConfig.bodyParts)).toEqual(['自定义部位'])
    expect(Object.keys(standard.punishmentConfig.positions)).toEqual(['自定义姿势'])
    expect(party.punishmentConfig).toEqual(standard.punishmentConfig)
  })

  it('局部惩罚条目覆盖只修改目标字段并保留其余默认条目', () => {
    const standard = createStandardConfigSnapshot({
      punishmentConfig: {
        tools: {
          手掌: { ratio: 0.5 },
        },
      },
    })

    expect(standard.punishmentConfig.tools['手掌']).toMatchObject({
      name: '手掌',
      intensity: 2,
      ratio: 0.5,
    })
    expect(standard.punishmentConfig.tools['尺子']).toBeDefined()
    expect(Object.keys(standard.punishmentConfig.tools)).toHaveLength(
      Object.keys(createStandardConfigSnapshot().punishmentConfig.tools).length
    )
  })

  it('uses one board generator and one compatible punishment pool for local and online modes', () => {
    const standard = createStandardConfigSnapshot()
    const local = createModeConfig('party', standard)
    const online = createModeConfig('online_party', standard)
    const random = deterministicRandom(0)

    const localBoard = createSharedBoard(local, random)
    const onlineBoard = createSharedBoard(online, deterministicRandom(0))

    expect(onlineBoard).toEqual(localBoard)
    expect(localBoard).toHaveLength(local.boardConfig.totalCells)
    expect(localBoard.filter(cell => cell.type === 'qa')).toHaveLength(
      local.boardConfig.qaCells ?? 0
    )
    expect(localBoard.filter(cell => cell.type === 'dare')).toHaveLength(
      local.boardConfig.dareCells ?? 0
    )

    const punishment = localBoard.find(cell => cell.type === 'punishment')?.effect?.punishment
    expect(punishment?.tool.name).toBe('手掌')
    expect(punishment?.bodyPart.name).toBe('屁股')
    expect(punishment?.position.name).toBe('站立')
  })

  it('keeps the standard selection semantics while stage overlays constrain mode results', () => {
    const standard = createStandardConfigSnapshot()
    const classic = createSharedBoard(createModeConfig('classic', standard), deterministicRandom(0))
    const party = createSharedBoard(createModeConfig('party', standard), deterministicRandom(0))
    const online = createSharedBoard(
      createModeConfig('online_party', standard),
      deterministicRandom(0)
    )
    const firstPunishment = (board: ReturnType<typeof createSharedBoard>) =>
      board.find(cell => cell.type === 'punishment')?.effect?.punishment

    expect(firstPunishment(classic)).toMatchObject({
      tool: { name: '手掌' },
      bodyPart: { name: '屁股' },
      position: { name: '站立' },
      strikes: 10,
    })
    expect(firstPunishment(party)).toMatchObject({
      tool: { name: '手掌' },
      bodyPart: { name: '屁股' },
      position: { name: '站立' },
      strikes: 5,
    })
    expect(firstPunishment(online)).toEqual(firstPunishment(party))
    expect(party.filter(cell => cell.type === 'qa')).not.toHaveLength(
      classic.filter(cell => cell.type === 'qa').length
    )
  })

  it('normalizes legacy cached configuration and rejects unknown or unsafe fields', () => {
    const standard = createStandardConfigSnapshot()
    const legacy = {
      boardConfig: {
        ...standard.boardConfig,
        chainPunishmentCells: undefined,
      },
      punishmentConfig: standard.punishmentConfig,
      trapConfig: standard.traps,
      stalePrivatePunishment: 'do-not-accept',
    }

    const migrated = normalizeConfigSnapshot(legacy)
    expect(migrated.boardConfig.chainPunishmentCells).toBe(0)
    expect(migrated.traps).toHaveLength(standard.traps.length)
    expect('stalePrivatePunishment' in migrated).toBe(false)
    expect(validateConfigSnapshot(migrated)).toBe(true)

    const defaulted = normalizeConfigSnapshot({})
    expect(defaulted.boardConfig.chainPunishmentCells).toBe(2)
    expect(defaulted.rulesetVersion).toBe('classic_v1')

    const online = normalizeConfigSnapshot({ modeId: 'online_party', authority: 'local' })
    expect(online.authority).toBe('server')
    expect(validateConfigSnapshot({ ...online, authority: 'local' })).toBe(false)
  })

  it('serializes a complete private snapshot but exposes only a safe public projection', () => {
    const snapshot = createModeConfig('online_party', createStandardConfigSnapshot())
    const encoded = serializeConfigSnapshot(snapshot)
    const publicConfig = projectPublicConfig(snapshot)

    expect(JSON.parse(encoded)).toEqual(snapshot)
    expect(publicConfig).toMatchObject({
      modeId: 'online_party',
      rulesetVersion: 'party_v3',
      boardConfig: snapshot.boardConfig,
    })
    expect(publicConfig).not.toHaveProperty('punishmentConfig')
    expect(publicConfig).not.toHaveProperty('traps')
    expect(JSON.stringify(publicConfig)).not.toContain('手掌')
  })

  it('keeps the standard snapshot unchanged when a mode overlay is applied', () => {
    const standard = createStandardConfigSnapshot()
    const before = JSON.stringify(standard)
    const modeSnapshots: ConfigSnapshot[] = [
      createModeConfig('classic', standard),
      createModeConfig('party', standard),
      createModeConfig('online_party', standard),
    ]

    expect(JSON.stringify(standard)).toBe(before)
    expect(modeSnapshots.map(snapshot => snapshot.rulesetVersion)).toEqual([
      'classic_v1',
      'party_v3',
      'party_v3',
    ])
    expect(MODE_POLICIES.party.stageConstraints.warmup).toMatchObject({
      maxToolIntensity: 3,
      minStrikes: 5,
    })
    expect(MODE_POLICIES.online_party.eventOverlay).toBe('party')
    expect(MODE_POLICIES.online_party.interventionOverlay).toBe('party')
  })
})
