import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  collectProductionDiagnosticSources,
  createSafeDiagnosticsReport,
  writeSafeDiagnosticsReport,
} from './collect-safe-production-diagnostics.mjs'

const scriptPath = fileURLToPath(
  new URL('./collect-safe-production-diagnostics.mjs', import.meta.url)
)
const fixturePath = fileURLToPath(
  new URL('./fixtures/safe-production-diagnostics.synthetic.json', import.meta.url)
)
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))

describe('safe production diagnostics', () => {
  it('projects raw diagnostic sources onto the fixed report allowlist', () => {
    const report = createSafeDiagnosticsReport(fixture)

    expect(report).toEqual({
      schemaVersion: 1,
      capturedAt: '2026-08-08T00:00:00.000Z',
      roomServer: {
        serviceActive: true,
        containerRunning: true,
        containerHealthy: true,
        image: 'flying-chess-room:1.15.0',
        memoryLimitBytes: 134217728,
        healthStatus: 200,
        readyStatus: 200,
        version: '1.15.0',
        protocolVersion: 1,
        buildSha: 'df974cf9cbc003fc8624629983c068aa3573ed22',
      },
      discourse: {
        serviceReachable: true,
        httpStatus: 200,
        pendingMigrations: 0,
      },
      host: {
        diskAvailableBytes: 123456789,
        kernelOomEvents: 0,
      },
      errors: [],
    })
  })

  it('records only fixed error codes when a command source contains raw stderr', () => {
    const source = structuredClone(fixture)
    source.roomHealth.exitCode = 28
    source.roomHealth.errorCode = 'ROOM_HEALTH_CHECK_FAILED'
    source.roomHealth.stderr = 'TOKEN=FAKE_TOKEN_FOR_REDACTION_TEST_ONLY'

    const report = createSafeDiagnosticsReport(source)

    expect(report.errors).toEqual(['ROOM_HEALTH_CHECK_FAILED'])
    expect(JSON.stringify(report).includes('FAKE_')).toBe(false)
    expect(JSON.stringify(report).includes('stderr')).toBe(false)
  })

  it('fails closed when any nested report key is forbidden', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    try {
      const report = createSafeDiagnosticsReport(fixture)
      report.roomServer.secret = 'FAKE_VALUE_FOR_REDACTION_TEST_ONLY'

      await expect(writeSafeDiagnosticsReport(outputPath, report)).rejects.toMatchObject({
        code: 'FORBIDDEN_KEY',
      })
      expect(existsSync(outputPath)).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('rejects harmless-looking fields outside the fixed schema allowlist', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    try {
      const report = createSafeDiagnosticsReport(fixture)
      report.roomServer.diagnosticNote = 'not part of schema v1'

      await expect(writeSafeDiagnosticsReport(outputPath, report)).rejects.toMatchObject({
        code: 'SCHEMA_MISMATCH',
      })
      expect(existsSync(outputPath)).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it.each([
    'https://fake-user:FAKE_URI_PASSWORD_FOR_REDACTION_TEST_ONLY@example.test/image',
    'Bearer FAKE_BEARER_TOKEN_FOR_REDACTION_TEST_ONLY',
    'Authorization: FAKE_AUTHORIZATION_VALUE_FOR_REDACTION_TEST_ONLY',
    'PASSWORD=FAKE_PASSWORD_FOR_REDACTION_TEST_ONLY',
    'SECRET=FAKE_SECRET_FOR_REDACTION_TEST_ONLY',
    'TOKEN=FAKE_TOKEN_FOR_REDACTION_TEST_ONLY',
  ])('fails closed when a report string matches a forbidden credential form', async value => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    try {
      const report = createSafeDiagnosticsReport(fixture)
      report.roomServer.image = value

      await expect(writeSafeDiagnosticsReport(outputPath, report)).rejects.toMatchObject({
        code: 'FORBIDDEN_VALUE',
      })
      expect(existsSync(outputPath)).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('writes an atomic 0600 report without raw stderr or temporary files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    try {
      await writeSafeDiagnosticsReport(outputPath, createSafeDiagnosticsReport(fixture))

      expect(statSync(outputPath).mode & 0o777).toBe(0o600)
      expect(readdirSync(directory)).toEqual(['report.json'])
      const serialized = readFileSync(outputPath, 'utf8')
      expect(serialized.includes('FAKE_')).toBe(false)
      expect(serialized.includes('stderr')).toBe(false)
      expect(serialized.includes('launcherCommand')).toBe(false)
      expect(serialized.includes('environment')).toBe(false)
      expect(serialized.includes('roomCode')).toBe(false)
      expect(serialized.includes('resumeToken')).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('cleans the temporary file and leaves no partial report when atomic rename fails', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    mkdirSync(outputPath)
    try {
      await expect(
        writeSafeDiagnosticsReport(outputPath, createSafeDiagnosticsReport(fixture))
      ).rejects.toBeDefined()
      expect(readdirSync(directory)).toEqual(['report.json'])
      expect(readdirSync(outputPath)).toEqual([])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('does not create a missing output directory implicitly', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const missingDirectory = join(directory, 'missing')
    try {
      await expect(
        writeSafeDiagnosticsReport(
          join(missingDirectory, 'report.json'),
          createSafeDiagnosticsReport(fixture)
        )
      ).rejects.toMatchObject({ code: 'OUTPUT_DIRECTORY_INVALID' })
      expect(existsSync(missingDirectory)).toBe(false)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('supports a fixture-only CLI run without echoing fixture contents', () => {
    const directory = mkdtempSync(join(tmpdir(), 'flying-chess-safe-diagnostics-'))
    const outputPath = join(directory, 'report.json')
    try {
      const result = spawnSync(
        process.execPath,
        [scriptPath, '--fixture', fixturePath, '--output', outputPath],
        { encoding: 'utf8' }
      )

      expect(result.status).toBe(0)
      expect(result.stdout).toBe('SAFE_DIAGNOSTICS_WRITTEN\n')
      expect(result.stderr).toBe('')
      expect(`${result.stdout}${result.stderr}`.includes('FAKE_')).toBe(false)
      expect(statSync(outputPath).mode & 0o777).toBe(0o600)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('collects through fixed timeout-bounded commands and drops command stderr', async () => {
    const commands = []
    const executeCommand = async command => {
      commands.push(command)
      const joined = [command.file, ...command.args].join(' ')
      let stdout = ''
      if (joined.includes('systemctl')) stdout = 'active\n'
      else if (joined.includes('docker inspect')) {
        stdout = 'true|healthy|flying-chess-room:1.15.0|134217728\n'
      } else if (joined.includes('/health')) {
        stdout = `${JSON.stringify({
          status: 'ok',
          version: '1.15.0',
          protocolVersion: 1,
          buildSha: 'df974cf9cbc003fc8624629983c068aa3573ed22',
        })}\n200`
      } else if (joined.includes('/ready')) stdout = '{"status":"ready"}\n200'
      else if (joined.includes('/srv/status')) stdout = 'ok\n200'
      else if (joined.includes('rails runner')) stdout = '0\n'
      else if (joined.includes('df')) stdout = 'Avail\n123456789\n'
      else if (joined.includes('awk')) stdout = '0\n'
      return {
        exitCode: 0,
        stdout,
        stderr: 'TOKEN=FAKE_TOKEN_FOR_REDACTION_TEST_ONLY',
      }
    }

    const source = await collectProductionDiagnosticSources({
      executeCommand,
      capturedAt: '2026-08-08T00:00:00.000Z',
    })
    const report = createSafeDiagnosticsReport(source)

    expect(commands).toHaveLength(8)
    expect(commands.every(command => command.timeoutMs > 0 && command.timeoutMs <= 5_000)).toBe(
      true
    )
    const dockerInspect = commands.find(
      command => command.file === 'docker' && command.args[0] === 'inspect'
    )
    expect(dockerInspect?.args.join(' ')).toContain('--format')
    expect(dockerInspect?.args.join(' ')).not.toContain('.Config.Env')
    expect(dockerInspect?.args.join(' ')).not.toContain('.Path')
    expect(dockerInspect?.args.join(' ')).not.toContain('.Args')
    const curlTargets = commands
      .filter(command => command.file === 'curl')
      .map(command => command.args.at(-1))
    expect(curlTargets).toContain('http://172.17.0.1:8787/health')
    expect(curlTargets).toContain('http://172.17.0.1:8787/ready')
    expect(curlTargets).not.toContain('http://127.0.0.1:8787/health')
    expect(curlTargets).not.toContain('http://127.0.0.1:8787/ready')
    expect(JSON.stringify(source).includes('FAKE_')).toBe(false)
    expect(report).toMatchObject({
      roomServer: { healthStatus: 200, readyStatus: 200, containerHealthy: true },
      discourse: { httpStatus: 200, pendingMigrations: 0 },
      host: { diskAvailableBytes: 123456789, kernelOomEvents: 0 },
      errors: [],
    })
  })
})
