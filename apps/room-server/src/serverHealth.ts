import type { RoomServerOperationalSnapshot } from './serverLifecycle'

interface ServerBuildInformation {
  readonly version: string
  readonly buildSha: string
  readonly protocolVersion: number
  readonly startedAt: number
}

export function createHealthResponse(
  build: ServerBuildInformation,
  snapshot: RoomServerOperationalSnapshot,
  timestamp = Date.now(),
  rssBytes = process.memoryUsage().rss
): Readonly<Record<string, string | number>> {
  return {
    status: 'ok',
    version: build.version,
    buildSha: build.buildSha,
    protocolVersion: build.protocolVersion,
    uptimeSeconds: Math.max(0, Math.floor((timestamp - build.startedAt) / 1_000)),
    rssBytes,
    rooms: snapshot.rooms,
    activeGames: snapshot.activeGames,
    connections: snapshot.connections,
    drainBlockingRooms: snapshot.drainBlockingRooms,
  }
}

export function createReadinessResponse(draining: boolean): Readonly<{
  status: 'ready' | 'draining'
  acceptingNewRooms: boolean
  draining: boolean
}> {
  return {
    status: draining ? 'draining' : 'ready',
    acceptingNewRooms: !draining,
    draining,
  }
}
