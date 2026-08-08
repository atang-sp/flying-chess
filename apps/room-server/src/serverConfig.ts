import { validateMetricsToken } from './serverMetrics'

const DEFAULT_DRAIN_TIMEOUT_MS = 30 * 60 * 1_000
const MAX_DRAIN_TIMEOUT_MS = 24 * 60 * 60 * 1_000
const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/
const BUILD_SHA_PATTERN = /^[0-9a-f]{7,64}$/i

export function validateRoomServerVersion(version: string): void {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error('ROOM_SERVER_VERSION must be a safe release identifier')
  }
}

export function validateRoomServerBuildSha(buildSha: string): void {
  if (buildSha !== 'unknown' && !BUILD_SHA_PATTERN.test(buildSha)) {
    throw new Error('ROOM_SERVER_BUILD_SHA must be a public hexadecimal commit identifier')
  }
}

export interface RoomServerEnvironmentConfig {
  readonly version: string
  readonly buildSha: string
  readonly drainTimeoutMs: number
  readonly metricsToken?: string
}

export function readRoomServerEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env
): RoomServerEnvironmentConfig {
  const version =
    environment.ROOM_SERVER_VERSION === undefined ? 'dev' : environment.ROOM_SERVER_VERSION.trim()
  validateRoomServerVersion(version)

  const buildSha =
    environment.ROOM_SERVER_BUILD_SHA === undefined
      ? 'unknown'
      : environment.ROOM_SERVER_BUILD_SHA.trim()
  validateRoomServerBuildSha(buildSha)

  const drainTimeoutRaw = environment.ROOM_DRAIN_TIMEOUT_MS
  const drainTimeoutMs =
    drainTimeoutRaw === undefined
      ? DEFAULT_DRAIN_TIMEOUT_MS
      : /^\d+$/.test(drainTimeoutRaw)
        ? Number(drainTimeoutRaw)
        : Number.NaN
  if (
    !Number.isSafeInteger(drainTimeoutMs) ||
    drainTimeoutMs < 1 ||
    drainTimeoutMs > MAX_DRAIN_TIMEOUT_MS
  ) {
    throw new Error('ROOM_DRAIN_TIMEOUT_MS must be an integer between 1 and 86400000')
  }

  const metricsToken =
    environment.ROOM_METRICS_TOKEN === undefined ? undefined : environment.ROOM_METRICS_TOKEN.trim()
  if (metricsToken !== undefined) validateMetricsToken(metricsToken)

  return {
    version,
    buildSha,
    drainTimeoutMs,
    ...(metricsToken === undefined ? {} : { metricsToken }),
  }
}
