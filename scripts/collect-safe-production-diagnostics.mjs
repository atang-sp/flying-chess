import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { chmod, open, readFile, rename, stat, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const FORBIDDEN_KEY_PATTERN =
  /password|passwd|secret|token|authorization|credential|smtp|api[_-]?key|private[_-]?key/i
const FORBIDDEN_VALUE_PATTERNS = [
  /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i,
  /\bBearer\s+\S+/i,
  /\bAuthorization\s*:/i,
  /\b(?:PASSWORD|SECRET|TOKEN)\s*=/i,
]
const SOURCE_ERROR_CODES = [
  ['roomService', 'ROOM_SERVICE_CHECK_FAILED'],
  ['container', 'CONTAINER_CHECK_FAILED'],
  ['roomHealth', 'ROOM_HEALTH_CHECK_FAILED'],
  ['roomReady', 'ROOM_READY_CHECK_FAILED'],
  ['discourseHealth', 'DISCOURSE_HEALTH_CHECK_FAILED'],
  ['pendingMigrations', 'PENDING_MIGRATIONS_CHECK_FAILED'],
  ['diskAvailable', 'DISK_CHECK_FAILED'],
  ['kernelOomEvents', 'OOM_CHECK_FAILED'],
]
const SAFE_ERROR_CODES = new Set(SOURCE_ERROR_CODES.map(([, errorCode]) => errorCode))
const ROOM_SERVER_INTERNAL_ORIGIN = 'http://172.17.0.1:8787'
const REPORT_KEYS = ['schemaVersion', 'capturedAt', 'roomServer', 'discourse', 'host', 'errors']
const ROOM_SERVER_KEYS = [
  'serviceActive',
  'containerRunning',
  'containerHealthy',
  'image',
  'memoryLimitBytes',
  'healthStatus',
  'readyStatus',
  'version',
  'protocolVersion',
  'buildSha',
]
const DISCOURSE_KEYS = ['serviceReachable', 'httpStatus', 'pendingMigrations']
const HOST_KEYS = ['diskAvailableBytes', 'kernelOomEvents']

export class SafeDiagnosticsError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

function assertSafeReportValue(value) {
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUE_PATTERNS.some(pattern => pattern.test(value))) {
      throw new SafeDiagnosticsError('FORBIDDEN_VALUE')
    }
    return
  }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) assertSafeReportValue(item)
    return
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) throw new SafeDiagnosticsError('FORBIDDEN_KEY')
    assertSafeReportValue(child)
  }
}

function hasExactKeys(value, expectedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actualKeys = Object.keys(value)
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every(expectedKey => actualKeys.includes(expectedKey))
  )
}

function isUnsignedIntegerOrNull(value) {
  return value === null || (Number.isSafeInteger(value) && value >= 0)
}

function isSafeStringOrNull(value, pattern) {
  return value === null || (typeof value === 'string' && pattern.test(value))
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function assertFixedReportSchema(report) {
  const roomServer = report?.roomServer
  const discourse = report?.discourse
  const host = report?.host
  const valid =
    hasExactKeys(report, REPORT_KEYS) &&
    report.schemaVersion === 1 &&
    isIsoTimestamp(report.capturedAt) &&
    hasExactKeys(roomServer, ROOM_SERVER_KEYS) &&
    typeof roomServer.serviceActive === 'boolean' &&
    typeof roomServer.containerRunning === 'boolean' &&
    typeof roomServer.containerHealthy === 'boolean' &&
    isSafeStringOrNull(roomServer.image, /^[A-Za-z0-9][A-Za-z0-9._/:@+-]{0,199}$/) &&
    isUnsignedIntegerOrNull(roomServer.memoryLimitBytes) &&
    isUnsignedIntegerOrNull(roomServer.healthStatus) &&
    isUnsignedIntegerOrNull(roomServer.readyStatus) &&
    isSafeStringOrNull(roomServer.version, /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/) &&
    isUnsignedIntegerOrNull(roomServer.protocolVersion) &&
    isSafeStringOrNull(roomServer.buildSha, /^(?:unknown|[0-9a-f]{7,64})$/i) &&
    hasExactKeys(discourse, DISCOURSE_KEYS) &&
    typeof discourse.serviceReachable === 'boolean' &&
    isUnsignedIntegerOrNull(discourse.httpStatus) &&
    isUnsignedIntegerOrNull(discourse.pendingMigrations) &&
    hasExactKeys(host, HOST_KEYS) &&
    isUnsignedIntegerOrNull(host.diskAvailableBytes) &&
    isUnsignedIntegerOrNull(host.kernelOomEvents) &&
    Array.isArray(report.errors) &&
    new Set(report.errors).size === report.errors.length &&
    report.errors.every(errorCode => SAFE_ERROR_CODES.has(errorCode))
  if (!valid) throw new SafeDiagnosticsError('SCHEMA_MISMATCH')
}

function parseUnsignedInteger(value) {
  const normalized = String(value ?? '').trim()
  if (!/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function extractLastUnsignedInteger(value) {
  const match = String(value ?? '')
    .trim()
    .split(/\r?\n/)
    .reverse()
    .find(line => /^\d+$/.test(line.trim()))
  return match?.trim() ?? ''
}

function splitHttpOutput(value) {
  const match = String(value ?? '').match(/^([\s\S]*)\r?\n(\d{3})$/)
  if (!match) return null
  return { body: match[1] ?? '', httpStatus: Number(match[2]) }
}

function parseContainerSummary(value) {
  const [running, health, image, memoryLimitBytes] = String(value ?? '')
    .trim()
    .split('|')
  return {
    containerRunning: running === 'true',
    containerHealthy: health === 'healthy',
    image: image || null,
    memoryLimitBytes: parseUnsignedInteger(memoryLimitBytes),
  }
}

/**
 * Projects untrusted diagnostic sources onto the only fields permitted in a report.
 * Unknown source fields are deliberately ignored rather than copied through.
 */
export function createSafeDiagnosticsReport(source) {
  const container = parseContainerSummary(source?.container?.stdout)
  const roomHealth = source?.roomHealth?.body ?? {}
  const errors = SOURCE_ERROR_CODES.flatMap(([sourceName, errorCode]) =>
    source?.[sourceName]?.exitCode === 0 ? [] : [errorCode]
  )
  return {
    schemaVersion: 1,
    capturedAt: source?.capturedAt ?? new Date().toISOString(),
    roomServer: {
      serviceActive:
        source?.roomService?.exitCode === 0 &&
        String(source?.roomService?.stdout ?? 'active').trim() === 'active',
      ...container,
      healthStatus: parseUnsignedInteger(source?.roomHealth?.httpStatus),
      readyStatus: parseUnsignedInteger(source?.roomReady?.httpStatus),
      version: typeof roomHealth.version === 'string' ? roomHealth.version : null,
      protocolVersion: parseUnsignedInteger(roomHealth.protocolVersion),
      buildSha: typeof roomHealth.buildSha === 'string' ? roomHealth.buildSha : null,
    },
    discourse: {
      serviceReachable: source?.discourseHealth?.exitCode === 0,
      httpStatus: parseUnsignedInteger(source?.discourseHealth?.httpStatus),
      pendingMigrations: parseUnsignedInteger(source?.pendingMigrations?.stdout),
    },
    host: {
      diskAvailableBytes: parseUnsignedInteger(source?.diskAvailable?.stdout),
      kernelOomEvents: parseUnsignedInteger(source?.kernelOomEvents?.stdout),
    },
    errors,
  }
}

function defaultExecuteCommand(command) {
  return new Promise(resolve => {
    execFile(
      command.file,
      command.args,
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1_024,
        timeout: command.timeoutMs,
        windowsHide: true,
      },
      (error, stdout) => {
        resolve({
          exitCode: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
          stdout: typeof stdout === 'string' ? stdout : '',
        })
      }
    )
  })
}

function command(file, args) {
  return { file, args, timeoutMs: 5_000 }
}

function httpCommand(url) {
  return command('curl', [
    '--silent',
    '--max-time',
    '5',
    '--connect-timeout',
    '2',
    '--output',
    '-',
    '--write-out',
    '\n%{http_code}',
    url,
  ])
}

function normalizeHttpSource(result, parseJson) {
  if (result.exitCode !== 0) return { exitCode: result.exitCode }
  const parsed = splitHttpOutput(result.stdout)
  if (!parsed) return { exitCode: 1 }
  if (!parseJson) return { exitCode: 0, httpStatus: parsed.httpStatus }
  try {
    return { exitCode: 0, httpStatus: parsed.httpStatus, body: JSON.parse(parsed.body) }
  } catch {
    return { exitCode: 1, httpStatus: parsed.httpStatus }
  }
}

function normalizeNumericSource(result) {
  if (result.exitCode !== 0) return { exitCode: result.exitCode }
  const stdout = extractLastUnsignedInteger(result.stdout)
  return stdout ? { exitCode: 0, stdout } : { exitCode: 1 }
}

/**
 * Runs only fixed, timeout-bounded commands. The adapter intentionally never returns stderr.
 */
export async function collectProductionDiagnosticSources({
  executeCommand = defaultExecuteCommand,
  capturedAt = new Date().toISOString(),
} = {}) {
  const commands = {
    roomService: command('systemctl', [
      'show',
      '--property=ActiveState',
      '--value',
      'flying-chess-room.service',
    ]),
    container: command('docker', [
      'inspect',
      '--format',
      '{{.State.Running}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.Config.Image}}|{{.HostConfig.Memory}}',
      'flying-chess-room',
    ]),
    roomHealth: httpCommand(`${ROOM_SERVER_INTERNAL_ORIGIN}/health`),
    roomReady: httpCommand(`${ROOM_SERVER_INTERNAL_ORIGIN}/ready`),
    discourseHealth: httpCommand('https://atang-sp.run.place/srv/status'),
    pendingMigrations: command('docker', [
      'exec',
      'app',
      'bash',
      '-lc',
      "cd /var/www/discourse && bundle exec rails runner 'puts ActiveRecord::Base.connection.migration_context.open.pending_migrations.length'",
    ]),
    diskAvailable: command('df', ['--block-size=1', '--output=avail', '/var/discourse']),
    kernelOomEvents: command('awk', ['$1 == "oom_kill" { print $2 }', '/proc/vmstat']),
  }
  const [
    roomService,
    container,
    roomHealth,
    roomReady,
    discourseHealth,
    pendingMigrations,
    diskAvailable,
    kernelOomEvents,
  ] = await Promise.all(Object.values(commands).map(descriptor => executeCommand(descriptor)))

  return {
    capturedAt,
    roomService: { exitCode: roomService.exitCode, stdout: roomService.stdout },
    container: { exitCode: container.exitCode, stdout: container.stdout },
    roomHealth: normalizeHttpSource(roomHealth, true),
    roomReady: normalizeHttpSource(roomReady, true),
    discourseHealth: normalizeHttpSource(discourseHealth, false),
    pendingMigrations: normalizeNumericSource(pendingMigrations),
    diskAvailable: normalizeNumericSource(diskAvailable),
    kernelOomEvents: normalizeNumericSource(kernelOomEvents),
  }
}

export async function writeSafeDiagnosticsReport(outputPath, report) {
  assertSafeReportValue(report)
  assertFixedReportSchema(report)
  const outputDirectory = dirname(outputPath)
  const directory = await stat(outputDirectory).catch(() => null)
  if (!directory?.isDirectory()) throw new SafeDiagnosticsError('OUTPUT_DIRECTORY_INVALID')

  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`
  let handle
  try {
    handle = await open(temporaryPath, 'wx', 0o600)
    await handle.writeFile(`${JSON.stringify(report, null, 2)}\n`, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await chmod(temporaryPath, 0o600)
    await rename(temporaryPath, outputPath)
    await chmod(outputPath, 0o600)
  } catch (error) {
    await handle?.close().catch(() => undefined)
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}

function parseCliArguments(arguments_) {
  let fixturePath
  let outputPath
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]
    const value = arguments_[index + 1]
    if (!value) throw new SafeDiagnosticsError('ARGUMENTS_INVALID')
    if (name === '--fixture') fixturePath = value
    else if (name === '--output') outputPath = value
    else throw new SafeDiagnosticsError('ARGUMENTS_INVALID')
  }
  if (!outputPath) throw new SafeDiagnosticsError('ARGUMENTS_INVALID')
  return { fixturePath, outputPath }
}

async function runCli(arguments_) {
  const { fixturePath, outputPath } = parseCliArguments(arguments_)
  let source
  if (fixturePath) {
    try {
      source = JSON.parse(await readFile(fixturePath, 'utf8'))
    } catch {
      throw new SafeDiagnosticsError('FIXTURE_INVALID')
    }
  } else {
    source = await collectProductionDiagnosticSources()
  }
  await writeSafeDiagnosticsReport(outputPath, createSafeDiagnosticsReport(source))
  process.stdout.write('SAFE_DIAGNOSTICS_WRITTEN\n')
}

const isDirectExecution =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url

if (isDirectExecution) {
  try {
    await runCli(process.argv.slice(2))
  } catch (error) {
    const code =
      error instanceof SafeDiagnosticsError && /^[A-Z_]+$/.test(error.code)
        ? error.code
        : 'UNEXPECTED'
    process.stderr.write(`SAFE_DIAGNOSTICS_FAILED:${code}\n`)
    process.exitCode = 1
  }
}
