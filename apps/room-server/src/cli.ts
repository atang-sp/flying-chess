import { createRoomServer } from './server'
import { readRoomServerEnvironment } from './serverConfig'
import type { PartyEventCard } from '@flying-chess/game-core'

const port = Number.parseInt(process.env.PORT ?? '8787', 10)
const host = process.env.HOST ?? '0.0.0.0'
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',')
  .map(origin => origin.trim())
  .filter(Boolean)
const achievementClaimSecret = process.env.ACHIEVEMENT_CLAIM_SECRET
const achievementClaimUrl = process.env.ACHIEVEMENT_CLAIM_URL?.trim()
if (Boolean(achievementClaimSecret) !== Boolean(achievementClaimUrl)) {
  throw new Error('ACHIEVEMENT_CLAIM_SECRET and ACHIEVEMENT_CLAIM_URL must be configured together')
}
const testDice = Number.parseInt(process.env.ROOM_SERVER_TEST_DICE ?? '', 10)
const testReconnectGraceMs = Number.parseInt(
  process.env.ROOM_SERVER_TEST_RECONNECT_GRACE_MS ?? '',
  10
)
const rollDice =
  process.env.NODE_ENV === 'test' && Number.isInteger(testDice) && testDice >= 1 && testDice <= 6
    ? () => testDice
    : undefined
const quietTestEventDeck: readonly PartyEventCard[] | undefined =
  process.env.NODE_ENV === 'test'
    ? [
        {
          id: 'e2e-quiet-event',
          title: 'E2E 占位事件',
          description: '基础纵向切片不触发事件',
          tags: ['test'],
          trigger: { kind: 'every_n_turns', interval: 100 },
          effect: { kind: 'punishment_multiplier', multiplier: 1, durationTurns: 1 },
        },
      ]
    : undefined

async function main(): Promise<void> {
  const environment = readRoomServerEnvironment()
  const server = await createRoomServer({
    port,
    host,
    rollDice,
    eventDeck: quietTestEventDeck,
    allowedOrigins,
    achievementClaims:
      achievementClaimSecret && achievementClaimUrl
        ? { secret: achievementClaimSecret, claimUrl: achievementClaimUrl }
        : undefined,
    reconnectGraceMs:
      process.env.NODE_ENV === 'test' && testReconnectGraceMs > 0
        ? testReconnectGraceMs
        : undefined,
    version: environment.version,
    buildSha: environment.buildSha,
    drainTimeoutMs: environment.drainTimeoutMs,
    metricsToken: environment.metricsToken,
  })
  console.info(`room server listening on port ${server.port}`)

  let shutdownPromise: Promise<void> | undefined
  function shutdown(): Promise<void> {
    shutdownPromise ??= server
      .beginDrain()
      .then(() => {
        process.exitCode = 0
      })
      .catch(() => {
        console.error('room server failed to shut down cleanly')
        process.exitCode = 1
      })
    return shutdownPromise
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

void main().catch(() => {
  console.error('room server failed to start')
  process.exit(1)
})
