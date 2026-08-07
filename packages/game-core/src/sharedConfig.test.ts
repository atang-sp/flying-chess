import { describe, expect, it } from 'vitest'
import {
  createModeConfig,
  cryptoRandomInt,
  createSharedBoard,
  createStandardConfigSnapshot,
  MODE_POLICIES,
  normalizeConfigSnapshot,
  projectPublicConfig,
  serializeConfigSnapshot,
  validateConfigSnapshot,
  type BoardRandomSource,
  type ConfigSnapshot,
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
      rulesetVersion: 'party_v2',
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
      'party_v2',
      'party_v2',
    ])
    expect(MODE_POLICIES.party.stageConstraints.warmup).toMatchObject({
      maxToolIntensity: 3,
      minStrikes: 5,
    })
    expect(MODE_POLICIES.online_party.eventOverlay).toBe('party')
    expect(MODE_POLICIES.online_party.interventionOverlay).toBe('party')
  })
})
