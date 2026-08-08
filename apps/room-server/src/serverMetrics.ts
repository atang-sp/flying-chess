import { createHash, timingSafeEqual } from 'node:crypto'
import type { RoomServerOperationalSnapshot } from './serverLifecycle'

const MIN_METRICS_TOKEN_BYTES = 32
const MAX_METRICS_TOKEN_BYTES = 512

export function validateMetricsToken(token: string): void {
  const tokenBytes = Buffer.byteLength(token, 'utf8')
  if (
    tokenBytes < MIN_METRICS_TOKEN_BYTES ||
    tokenBytes > MAX_METRICS_TOKEN_BYTES ||
    /\s/.test(token)
  ) {
    throw new Error('ROOM_METRICS_TOKEN must contain 32-512 bytes without whitespace')
  }
}

export function isMetricsRequestAuthorized(
  authorizationHeader: string | undefined,
  expectedToken: string
): boolean {
  const candidate = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : ''
  const expectedDigest = createHash('sha256').update(expectedToken, 'utf8').digest()
  const candidateDigest = createHash('sha256').update(candidate, 'utf8').digest()
  return timingSafeEqual(expectedDigest, candidateDigest)
}

export const SERVER_METRIC_COUNTER_NAMES = [
  'connectionsOpenedTotal',
  'connectionsClosedTotal',
  'roomsCreatedTotal',
  'roomJoinsTotal',
  'roomResumesTotal',
  'gamesStartedTotal',
  'gamesFinishedTotal',
  'hostTransfersTotal',
  'roomsExpiredTotal',
  'protocolRejectedTotal',
  'rateLimitedMessagesTotal',
] as const

export type ServerMetricCounterName = (typeof SERVER_METRIC_COUNTER_NAMES)[number]

type ServerMetricCounters = Readonly<Record<ServerMetricCounterName, number>>

export interface ServerMetricsSnapshot {
  readonly schemaVersion: 1
  readonly counters: ServerMetricCounters
  readonly gauges: Readonly<{
    rooms: number
    activeGames: number
    connections: number
    drainBlockingRooms: number
    draining: 0 | 1
    rssBytes: number
    uptimeSeconds: number
  }>
}

function createEmptyCounters(): Record<ServerMetricCounterName, number> {
  return {
    connectionsOpenedTotal: 0,
    connectionsClosedTotal: 0,
    roomsCreatedTotal: 0,
    roomJoinsTotal: 0,
    roomResumesTotal: 0,
    gamesStartedTotal: 0,
    gamesFinishedTotal: 0,
    hostTransfersTotal: 0,
    roomsExpiredTotal: 0,
    protocolRejectedTotal: 0,
    rateLimitedMessagesTotal: 0,
  }
}

export class ServerMetrics {
  private readonly counters = createEmptyCounters()

  constructor(private readonly startedAt: number) {}

  increment(counter: ServerMetricCounterName): void {
    this.counters[counter] += 1
  }

  snapshot(
    operational: RoomServerOperationalSnapshot,
    draining: boolean,
    timestamp = Date.now(),
    rssBytes = process.memoryUsage().rss
  ): ServerMetricsSnapshot {
    return {
      schemaVersion: 1,
      counters: { ...this.counters },
      gauges: {
        rooms: operational.rooms,
        activeGames: operational.activeGames,
        connections: operational.connections,
        drainBlockingRooms: operational.drainBlockingRooms,
        draining: draining ? 1 : 0,
        rssBytes,
        uptimeSeconds: Math.max(0, Math.floor((timestamp - this.startedAt) / 1_000)),
      },
    }
  }
}
