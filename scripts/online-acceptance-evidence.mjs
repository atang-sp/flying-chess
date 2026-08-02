import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const forbiddenPrivateKeys = new Set([
  'identity',
  'identities',
  'participant',
  'participants',
  'nickname',
  'playername',
  'playernames',
  'roomcode',
  'settings',
  'spsettings',
  'message',
  'messagebody',
  'messages',
  'roomcontent',
  'punishment',
  'punishments',
  'punishmentdata',
  'punishmentsettings',
])

function findForbiddenPrivatePaths(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findForbiddenPrivatePaths(entry, `${path}[${index}]`))
  }
  if (typeof value !== 'object' || value === null) return []

  return Object.entries(value).flatMap(([key, entry]) => {
    const entryPath = path ? `${path}.${key}` : key
    const normalizedKey = key.toLowerCase().replaceAll(/[_-]/g, '')
    if (forbiddenPrivateKeys.has(normalizedKey)) return [entryPath]
    return findForbiddenPrivatePaths(entry, entryPath)
  })
}

function parseProof(rawProof) {
  if (typeof rawProof !== 'string' || rawProof.trim().length === 0) return null
  try {
    const proof = JSON.parse(rawProof)
    return typeof proof === 'object' && proof !== null && !Array.isArray(proof) ? proof : null
  } catch {
    return null
  }
}

function hasValidProofMetadata(proof, release, kind) {
  const recordedAtUtc = proof?.recordedAtUtc
  const recordedAt = typeof recordedAtUtc === 'string' ? Date.parse(recordedAtUtc) : NaN
  const artifacts = proof?.artifacts
  return (
    proof?.schemaVersion === 1 &&
    proof?.release === release &&
    proof?.kind === kind &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(recordedAtUtc) &&
    Number.isFinite(recordedAt) &&
    Array.isArray(artifacts) &&
    artifacts.length > 0 &&
    artifacts.every(
      artifact =>
        typeof artifact?.path === 'string' &&
        artifact.path.length > 0 &&
        !artifact.path.startsWith('/') &&
        !artifact.path.split('/').includes('..') &&
        typeof artifact.sha256 === 'string' &&
        /^[a-f0-9]{64}$/i.test(artifact.sha256)
    )
  )
}

const claimFieldsByKind = {
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

function proofClaimsMatch(proof, evidenceValue, kind) {
  if (typeof proof?.claims !== 'object' || proof.claims === null || Array.isArray(proof.claims)) {
    return false
  }
  return claimFieldsByKind[kind].every(
    field => JSON.stringify(proof.claims[field]) === JSON.stringify(evidenceValue?.[field])
  )
}

export function verifyOnlineAcceptanceEvidence(evidence, context = {}) {
  if (typeof evidence !== 'object' || evidence === null || Array.isArray(evidence)) {
    return {
      ok: false,
      failures: [{ gate: 'schema', message: '验收证据必须是 JSON 对象' }],
    }
  }

  const failures = []
  const fail = (gate, message) => failures.push({ gate, message })
  const hasStrictContext =
    typeof context === 'object' &&
    context !== null &&
    typeof context.expectedRelease === 'string' &&
    typeof context.referenceExists === 'function' &&
    typeof context.readReference === 'function' &&
    typeof context.readArtifact === 'function'
  if (!hasStrictContext) {
    fail('verification.context', '校验必须绑定当前发布版本并读取证据文件内容')
  }
  const referenceExists =
    typeof context === 'function' ? context : (context?.referenceExists ?? (() => false))
  const expectedRelease = typeof context === 'object' ? context?.expectedRelease : undefined
  const readReference = typeof context === 'object' ? context?.readReference : undefined
  const readArtifact = typeof context === 'object' ? context?.readArtifact : undefined
  if (evidence.schemaVersion !== 1) fail('schema.version', 'schemaVersion 必须为 1')
  if (typeof evidence.release !== 'string' || !/^v\d+\.\d+\.\d+$/.test(evidence.release)) {
    fail('release', 'release 必须是 vX.Y.Z 发布标签')
  }
  if (expectedRelease && evidence.release !== expectedRelease) {
    fail(
      'release.current',
      `证据发布 ${evidence.release ?? 'unknown'} 与当前待发布版本 ${expectedRelease} 不一致`
    )
  }
  const forbiddenPaths = findForbiddenPrivatePaths(evidence)
  if (forbiddenPaths.length > 0) {
    fail('privacy.forbidden_fields', `证据不得包含私人字段：${forbiddenPaths.join('、')}`)
  }
  const publicGateway = evidence.publicGateway
  if (publicGateway?.dnsResolved !== true) fail('gateway.dns', '房间子域权威 DNS 必须已生效')
  const certificateSans = Array.isArray(publicGateway?.certificateSans)
    ? publicGateway.certificateSans
    : []
  if (
    !certificateSans.includes('atang-sp.run.place') ||
    !certificateSans.includes('rooms.atang-sp.run.place')
  ) {
    fail('gateway.certificate', '公网证书 SAN 必须包含主域和房间子域')
  }
  if (publicGateway?.httpsHealth !== true) fail('gateway.https', '公网 HTTPS 健康检查必须通过')
  if (publicGateway?.wssCreateJoinReconnect !== true) {
    fail('gateway.wss', '公网 WSS 建房、加入和重连冒烟必须通过')
  }
  const loadTest = evidence.loadTest
  if (loadTest?.rooms !== 20) fail('load.rooms', '压测必须覆盖 20 个房间')
  if (loadTest?.connections !== 160) fail('load.connections', '压测必须覆盖 160 个连接')
  if (loadTest?.measurementScope !== 'all_room_clients') {
    fail('load.scope', '延迟必须测量所有房间客户端收到状态的时间')
  }
  if (!(Number.isFinite(loadTest?.p95Ms) && loadTest.p95Ms >= 0 && loadTest.p95Ms < 500)) {
    fail('load.p95', '全房间状态同步 P95 必须是小于 500ms 的非负数')
  }
  if (!(Number.isFinite(loadTest?.rssMiB) && loadTest.rssMiB > 0 && loadTest.rssMiB < 128)) {
    fail('load.rss', '房间服务 RSS 必须是小于 128MiB 的正数')
  }

  if (evidence.privacy?.passed !== true) fail('privacy', '隐私边界检查必须通过')
  const production = evidence.production
  if (production?.discourseHealthy !== true) {
    fail('production.discourse', 'Discourse 健康检查必须通过')
  }
  if (production?.kernelOomEvents !== 0) fail('production.oom', '生产部署期间不得发生 OOM')
  const swapSamples = Array.isArray(production?.swapSamplesMiB)
    ? production.swapSamplesMiB.filter(Number.isFinite)
    : []
  const swapRange =
    swapSamples.length >= 3 ? Math.max(...swapSamples) - Math.min(...swapSamples) : Infinity
  if (swapSamples.length < 3 || swapRange > 128) {
    fail('production.swap', '至少 3 个 swap 样本的峰峰值必须不超过 128MiB')
  }

  const physicalDevices = Array.isArray(evidence.physicalDevices) ? evidence.physicalDevices : []
  for (const platform of ['ios_safari', 'android_chrome']) {
    const device = physicalDevices.find(candidate => candidate?.platform === platform)
    const passed =
      device?.realDevice === true &&
      device?.createRoom === true &&
      device?.reconnect === true &&
      device?.fullGameCompleted === true
    if (!passed) {
      fail(`device.${platform}`, `${platform} 必须在真实设备完成建房、重连和完整对局`)
    }
  }

  const fieldSessions = Array.isArray(evidence.fieldSessions) ? evidence.fieldSessions : []
  for (const playerCount of [4, 6, 8]) {
    const session = fieldSessions.find(candidate => candidate?.playerCount === playerCount)
    const joinConfirmSeconds = session?.joinConfirmSeconds
    const passed =
      session?.realParticipants === true &&
      session?.unattended === true &&
      session?.completed === true &&
      typeof joinConfirmSeconds === 'number' &&
      joinConfirmSeconds >= 0 &&
      joinConfirmSeconds <= 60 &&
      session?.staffInterventions === 0
    if (!passed) {
      fail(
        `session.${playerCount}_players`,
        `${playerCount} 人场必须由真人在 60 秒内确认并零人工介入完成`
      )
    }
  }

  const requiredEvidenceHolders = [
    { label: 'public_gateway', kind: 'public_gateway', value: publicGateway },
    { label: 'load_test', kind: 'load_test', value: loadTest },
    { label: 'privacy_audit', kind: 'privacy_audit', value: evidence.privacy },
    { label: 'production_observation', kind: 'production_observation', value: production },
    ...['ios_safari', 'android_chrome'].map(platform => ({
      label: platform,
      kind: 'physical_device',
      value: physicalDevices.find(candidate => candidate?.platform === platform),
    })),
    ...[4, 6, 8].map(playerCount => ({
      label: `${playerCount}_players`,
      kind: 'field_session',
      value: fieldSessions.find(candidate => candidate?.playerCount === playerCount),
    })),
  ]
  const missingReferences = []
  const invalidProofs = []
  const mismatchedClaims = []
  const invalidArtifacts = []
  for (const holder of requiredEvidenceHolders) {
    if (!holder.value) continue
    const references = holder.value?.evidenceRefs
    if (!Array.isArray(references) || references.length === 0) {
      missingReferences.push(`${holder.label}（缺少引用）`)
      continue
    }
    for (const reference of references) {
      const isSafeRelativePath =
        typeof reference === 'string' &&
        reference.length > 0 &&
        !reference.startsWith('/') &&
        !reference.split('/').includes('..')
      if (!isSafeRelativePath || !referenceExists(reference)) {
        missingReferences.push(String(reference))
        continue
      }
      if (readReference) {
        const proof = parseProof(readReference(reference))
        const hasPrivateFields = proof ? findForbiddenPrivatePaths(proof).length > 0 : true
        const validMetadata = hasValidProofMetadata(proof, evidence.release, holder.kind)
        if (!validMetadata || hasPrivateFields) {
          invalidProofs.push(String(reference))
        } else {
          if (!proofClaimsMatch(proof, holder.value, holder.kind)) {
            mismatchedClaims.push(String(reference))
          }
          for (const artifact of proof.artifacts) {
            const artifactBytes = readArtifact?.(artifact.path)
            const actualSha256 = artifactBytes
              ? createHash('sha256').update(artifactBytes).digest('hex')
              : ''
            if (!referenceExists(artifact.path) || actualSha256 !== artifact.sha256.toLowerCase()) {
              invalidArtifacts.push(artifact.path)
            }
          }
        }
      }
    }
  }
  if (missingReferences.length > 0) {
    fail('evidence.refs', `证据引用不存在：${missingReferences.join('、')}`)
  }
  if (invalidProofs.length > 0) {
    fail(
      'evidence.proof',
      `证据文件为空、格式错误、含私人字段或元数据不匹配：${invalidProofs.join('、')}`
    )
  }
  if (mismatchedClaims.length > 0) {
    fail('evidence.claims', `证据声明与验收清单不一致：${mismatchedClaims.join('、')}`)
  }
  if (invalidArtifacts.length > 0) {
    fail('evidence.artifact', `原始材料不存在或 SHA-256 不匹配：${invalidArtifacts.join('、')}`)
  }

  return { ok: failures.length === 0, failures }
}

function runCli() {
  const evidenceArgument = process.argv[2]
  if (!evidenceArgument) {
    console.error('用法：npm run verify:online-acceptance -- <证据.json>')
    process.exitCode = 2
    return
  }

  const evidencePath = resolve(evidenceArgument)
  let evidence
  try {
    evidence = JSON.parse(readFileSync(evidencePath, 'utf8'))
  } catch (error) {
    console.error(`无法读取证据 JSON：${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 2
    return
  }

  const evidenceDirectory = dirname(evidencePath)
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const result = verifyOnlineAcceptanceEvidence(evidence, {
    expectedRelease: `v${packageJson.version}`,
    referenceExists(reference) {
      try {
        return statSync(resolve(evidenceDirectory, reference)).isFile()
      } catch {
        return false
      }
    },
    readReference(reference) {
      try {
        return readFileSync(resolve(evidenceDirectory, reference), 'utf8')
      } catch {
        return undefined
      }
    },
    readArtifact(reference) {
      try {
        return readFileSync(resolve(evidenceDirectory, reference))
      } catch {
        return undefined
      }
    },
  })
  if (result.ok) {
    console.log(`PASS ${evidence.release}：全部联机升温局硬门槛均有匿名证据`)
    return
  }

  console.error(`FAIL ${evidence.release ?? 'unknown'}：${result.failures.length} 个门槛未满足`)
  for (const failure of result.failures) console.error(`- [${failure.gate}] ${failure.message}`)
  process.exitCode = 1
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) runCli()
