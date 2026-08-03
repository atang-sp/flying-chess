import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { verifyOnlineAcceptanceEvidence } from './online-acceptance-evidence.mjs'

const verifierPath = fileURLToPath(new URL('./online-acceptance-evidence.mjs', import.meta.url))
const packageVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
).version
const artifactContents = 'anonymous acceptance artifact'
const artifactSha256 = '6a8a31835b9db9c616312f93f89e556ca380cc986fca993da786ee72697b957d'

function proofKind(reference) {
  if (reference.includes('public-gateway')) return 'public_gateway'
  if (reference.includes('load-test')) return 'load_test'
  if (reference.includes('privacy-audit')) return 'privacy_audit'
  if (reference.includes('production-observation')) return 'production_observation'
  if (reference.includes('session') && !reference.match(/[468]-player/)) return 'physical_device'
  return 'field_session'
}

function validEvidence() {
  return {
    schemaVersion: 1,
    release: 'v1.12.4',
    publicGateway: {
      dnsResolved: true,
      certificateSans: ['atang-sp.run.place', 'rooms.atang-sp.run.place'],
      httpsHealth: true,
      wssCreateJoinReconnect: true,
      evidenceRefs: ['evidence/public-gateway.json'],
    },
    loadTest: {
      rooms: 20,
      connections: 160,
      measurementScope: 'all_room_clients',
      p95Ms: 0.3,
      rssMiB: 101,
      evidenceRefs: ['evidence/load-test.json'],
    },
    privacy: { passed: true, evidenceRefs: ['evidence/privacy-audit.json'] },
    production: {
      discourseHealthy: true,
      kernelOomEvents: 0,
      swapSamplesMiB: [771, 804, 790],
      evidenceRefs: ['evidence/production-observation.json'],
    },
    physicalDevices: [
      {
        platform: 'ios_safari',
        realDevice: true,
        createRoom: true,
        reconnect: true,
        fullGameCompleted: true,
        evidenceRefs: ['evidence/ios-session.json'],
      },
      {
        platform: 'android_chrome',
        realDevice: true,
        createRoom: true,
        reconnect: true,
        fullGameCompleted: true,
        evidenceRefs: ['evidence/android-session.json'],
      },
    ],
    fieldSessions: [4, 6, 8].map(playerCount => ({
      playerCount,
      realParticipants: true,
      unattended: true,
      completed: true,
      joinConfirmSeconds: 45,
      staffInterventions: 0,
      evidenceRefs: [`evidence/${playerCount}-player-session.json`],
    })),
  }
}

const proofClaimFields = {
  public_gateway: ['dnsResolved', 'certificateSans', 'httpsHealth', 'wssCreateJoinReconnect'],
  load_test: ['rooms', 'connections', 'measurementScope', 'p95Ms', 'rssMiB'],
  privacy_audit: ['passed'],
  production_observation: ['discourseHealthy', 'kernelOomEvents', 'swapSamplesMiB'],
  physical_device: ['platform', 'realDevice', 'createRoom', 'reconnect', 'fullGameCompleted'],
  field_session: [
    'playerCount',
    'realParticipants',
    'unattended',
    'completed',
    'joinConfirmSeconds',
    'staffInterventions',
  ],
}

function evidenceValueForReference(evidence, reference) {
  const kind = proofKind(reference)
  if (kind === 'public_gateway') return evidence.publicGateway
  if (kind === 'load_test') return evidence.loadTest
  if (kind === 'privacy_audit') return evidence.privacy
  if (kind === 'production_observation') return evidence.production
  if (kind === 'physical_device') {
    const platform = reference.includes('ios-') ? 'ios_safari' : 'android_chrome'
    return evidence.physicalDevices.find(device => device.platform === platform)
  }
  const playerCount = Number(reference.match(/([468])-player/)?.[1])
  return evidence.fieldSessions.find(session => session.playerCount === playerCount)
}

function validProof(evidence, reference) {
  const kind = proofKind(reference)
  const value = evidenceValueForReference(evidence, reference)
  const claims = Object.fromEntries(proofClaimFields[kind].map(field => [field, value[field]]))
  return JSON.stringify({
    schemaVersion: 1,
    release: evidence.release,
    recordedAtUtc: '2026-08-02T10:00:00.000Z',
    kind,
    artifacts: [
      {
        path: reference.replace('evidence/', 'artifacts/').replace('.json', '.txt'),
        sha256: artifactSha256,
      },
    ],
    claims,
  })
}

function verifyEvidence(evidence, overrides = {}) {
  return verifyOnlineAcceptanceEvidence(evidence, {
    expectedRelease: 'v1.12.4',
    referenceExists: () => true,
    readReference: reference => validProof(evidence, reference),
    readArtifact: () => Buffer.from(artifactContents),
    ...overrides,
  })
}

describe('联机升温局验收证据', () => {
  it('接受满足全部硬门槛且引用文件存在的匿名证据', () => {
    const result = verifyEvidence(validEvidence())

    expect(result).toEqual({ ok: true, failures: [] })
  })

  it('拒绝不是对象的证据输入', () => {
    const result = verifyEvidence(null)

    expect(result.ok).toBe(false)
    expect(result.failures).toContainEqual({
      gate: 'schema',
      message: '验收证据必须是 JSON 对象',
    })
  })

  it('拒绝没有覆盖 20 房间 160 连接及资源门槛的压测证据', () => {
    const evidence = validEvidence()
    evidence.loadTest = {
      ...evidence.loadTest,
      rooms: 19,
      connections: 159,
      measurementScope: 'host_only',
      p95Ms: 500,
      rssMiB: 128,
    }

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual([
      'load.rooms',
      'load.connections',
      'load.scope',
      'load.p95',
      'load.rss',
    ])
  })

  it('拒绝用 null 冒充压测数值', () => {
    const evidence = validEvidence()
    evidence.loadTest.p95Ms = null
    evidence.loadTest.rssMiB = null

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual(['load.p95', 'load.rss'])
  })

  it('拒绝 DNS、双域证书或公网 HTTPS/WSS 未通过的上线证据', () => {
    const evidence = validEvidence()
    evidence.publicGateway = {
      dnsResolved: false,
      certificateSans: ['atang-sp.run.place'],
      httpsHealth: false,
      wssCreateJoinReconnect: false,
      evidenceRefs: ['evidence/public-gateway.json'],
    }

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual([
      'gateway.dns',
      'gateway.certificate',
      'gateway.https',
      'gateway.wss',
    ])
  })

  it('拒绝缺失真实 iOS 或 Android 完整对局与重连的证据', () => {
    const evidence = validEvidence()
    evidence.physicalDevices = [
      {
        ...evidence.physicalDevices[0],
        reconnect: false,
      },
    ]

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual([
      'device.ios_safari',
      'device.android_chrome',
    ])
  })

  it('拒绝不是 4/6/8 人真人、60 秒内确认、零人工介入的完整场次', () => {
    const evidence = validEvidence()
    evidence.fieldSessions = [
      { ...evidence.fieldSessions[0], unattended: false },
      { ...evidence.fieldSessions[1], joinConfirmSeconds: 61 },
    ]

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual([
      'session.4_players',
      'session.6_players',
      'session.8_players',
    ])
  })

  it('拒绝隐私、Discourse、OOM 或 swap 稳定性未过门槛的证据', () => {
    const evidence = validEvidence()
    evidence.privacy.passed = false
    evidence.production = {
      ...evidence.production,
      discourseHealthy: false,
      kernelOomEvents: 1,
      swapSamplesMiB: [700, 900, 700],
    }

    const result = verifyEvidence(evidence)

    expect(result.failures.map(failure => failure.gate)).toEqual([
      'privacy',
      'production.discourse',
      'production.oom',
      'production.swap',
    ])
  })

  it('拒绝证据 JSON 中出现昵称、房间码、消息或惩罚内容字段', () => {
    const evidence = validEvidence()
    evidence.fieldSessions[0].participants = ['不应保存的身份']

    const result = verifyEvidence(evidence)

    expect(result.failures).toContainEqual({
      gate: 'privacy.forbidden_fields',
      message: '证据不得包含私人字段：fieldSessions[0].participants',
    })
  })

  it('拒绝不存在的证据文件引用', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, {
      referenceExists: reference => reference !== 'evidence/6-player-session.json',
    })

    expect(result.failures).toContainEqual({
      gate: 'evidence.refs',
      message: '证据引用不存在：evidence/6-player-session.json',
    })
  })

  it('拒绝未知证据版本或非发布标签', () => {
    const evidence = validEvidence()
    evidence.schemaVersion = 2
    evidence.release = 'main'

    const result = verifyEvidence(evidence, { expectedRelease: 'main' })

    expect(result.failures.map(failure => failure.gate)).toEqual(['schema.version', 'release'])
  })

  it('拒绝与当前待发布版本不一致的证据', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, { expectedRelease: 'v1.12.5' })

    expect(result.failures).toContainEqual({
      gate: 'release.current',
      message: '证据发布 v1.12.4 与当前待发布版本 v1.12.5 不一致',
    })
  })

  it('拒绝空白或无法解析的证据引用文件', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, { readReference: () => '' })

    expect(result.failures.map(failure => failure.gate)).toContain('evidence.proof')
  })

  it('拒绝没有明确 UTC 时区的证明时间', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, {
      readReference: reference => {
        const proof = JSON.parse(validProof(evidence, reference))
        proof.recordedAtUtc = '2026-08-02'
        return JSON.stringify(proof)
      },
    })

    expect(result.failures.map(failure => failure.gate)).toContain('evidence.proof')
  })

  it('拒绝元数据有效但声明与验收清单不一致的证据文件', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, {
      readReference: reference =>
        JSON.stringify({
          schemaVersion: 1,
          release: 'v1.12.4',
          recordedAtUtc: '2026-08-02T10:00:00.000Z',
          kind: proofKind(reference),
          artifacts: [
            {
              path: reference.replace('evidence/', 'artifacts/').replace('.json', '.txt'),
              sha256: artifactSha256,
            },
          ],
          claims: {},
        }),
    })

    expect(result.failures.map(failure => failure.gate)).toContain('evidence.claims')
  })

  it('拒绝无法用 SHA-256 对应到原始材料的结构化证明', () => {
    const evidence = validEvidence()
    const result = verifyEvidence(evidence, {
      readArtifact: () => Buffer.from('digest mismatch'),
    })

    expect(result.failures.map(failure => failure.gate)).toContain('evidence.artifact')
  })

  it('拒绝未提供当前版本与证据读取器的宽松调用', () => {
    const result = verifyOnlineAcceptanceEvidence(validEvidence(), () => true)

    expect(result.failures).toContainEqual({
      gate: 'verification.context',
      message: '校验必须绑定当前发布版本并读取证据文件内容',
    })
  })

  it('命令行缺少证据文件时以用法错误退出', () => {
    const result = spawnSync(process.execPath, [verifierPath], { encoding: 'utf8' })

    expect(result.status).toBe(2)
    expect(result.stderr).toContain('用法：npm run verify:online-acceptance -- <证据.json>')
  })

  it('命令行读取结构化证明并绑定 package.json 当前版本', () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'flying-chess-acceptance-'))
    try {
      const evidence = validEvidence()
      evidence.release = `v${packageVersion}`
      const references = [
        ...evidence.publicGateway.evidenceRefs,
        ...evidence.loadTest.evidenceRefs,
        ...evidence.privacy.evidenceRefs,
        ...evidence.production.evidenceRefs,
        ...evidence.physicalDevices.flatMap(device => device.evidenceRefs),
        ...evidence.fieldSessions.flatMap(session => session.evidenceRefs),
      ]
      for (const reference of references) {
        const proofPath = join(temporaryDirectory, reference)
        mkdirSync(dirname(proofPath), { recursive: true })
        const proof = JSON.parse(validProof(evidence, reference))
        writeFileSync(proofPath, JSON.stringify(proof))
        for (const artifact of proof.artifacts) {
          const artifactPath = join(temporaryDirectory, artifact.path)
          mkdirSync(dirname(artifactPath), { recursive: true })
          writeFileSync(artifactPath, artifactContents)
        }
      }
      const evidencePath = join(temporaryDirectory, 'evidence.json')
      writeFileSync(evidencePath, JSON.stringify(evidence))

      const result = spawnSync(process.execPath, [verifierPath, evidencePath], { encoding: 'utf8' })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`PASS v${packageVersion}`)
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })
})
