import { afterEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { CURRENT_ONLINE_PROTOCOL_VERSION } from '@flying-chess/game-core'
import { createRoomServer, type RunningRoomServer } from '../src/server'
import type { ServerMessage } from '../src/protocol'

class OperabilityClient {
  private readonly buffered: ServerMessage[] = []
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean
    resolve: (message: ServerMessage) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = []

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString()) as ServerMessage
      const waiterIndex = this.waiters.findIndex(waiter => waiter.predicate(message))
      if (waiterIndex < 0) {
        this.buffered.push(message)
        return
      }
      const [waiter] = this.waiters.splice(waiterIndex, 1)
      clearTimeout(waiter.timer)
      waiter.resolve(message)
    })
  }

  static async connect(url: string): Promise<OperabilityClient> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve)
      socket.once('error', reject)
    })
    return new OperabilityClient(socket)
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message))
  }

  next(predicate: (message: ServerMessage) => boolean, timeoutMs = 2_000): Promise<ServerMessage> {
    const bufferedIndex = this.buffered.findIndex(predicate)
    if (bufferedIndex >= 0) {
      const [message] = this.buffered.splice(bufferedIndex, 1)
      return Promise.resolve(message)
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiterIndex = this.waiters.findIndex(waiter => waiter.timer === timer)
        if (waiterIndex >= 0) this.waiters.splice(waiterIndex, 1)
        reject(new Error('timed out waiting for room-server message'))
      }, timeoutMs)
      this.waiters.push({ predicate, resolve, reject, timer })
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return
    const closed = new Promise<void>(resolve => this.socket.once('close', resolve))
    this.socket.close()
    await closed
  }
}

function httpBase(server: RunningRoomServer): string {
  return server.wsUrl.replace('ws://', 'http://')
}

describe('room server operability', () => {
  let server: RunningRoomServer | undefined
  const clients: OperabilityClient[] = []

  afterEach(async () => {
    await Promise.all(clients.map(client => client.disconnect()))
    clients.length = 0
    await server?.close()
  })

  it('keeps liveness healthy while readiness rejects new workload during drain', async () => {
    server = await createRoomServer({
      port: 0,
      version: '1.15.0',
      buildSha: 'abc1234',
      drainTimeoutMs: 2_000,
    })
    const host = await OperabilityClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'health-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '运维测试玩家',
      color: '#ff6b6b',
    })
    await host.next(message => message.type === 'session')

    const healthy = await fetch(`${httpBase(server)}/health`)
    expect(healthy.status).toBe(200)
    await expect(healthy.json()).resolves.toMatchObject({
      status: 'ok',
      version: '1.15.0',
      buildSha: 'abc1234',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
    })
    const ready = await fetch(`${httpBase(server)}/ready`)
    expect(ready.status).toBe(200)
    await expect(ready.json()).resolves.toMatchObject({
      status: 'ready',
      acceptingNewRooms: true,
      draining: false,
    })

    const draining = server.beginDrain()
    const drainingHealth = await fetch(`${httpBase(server)}/health`)
    expect(drainingHealth.status).toBe(200)
    const drainingReady = await fetch(`${httpBase(server)}/ready`)
    expect(drainingReady.status).toBe(503)
    await expect(drainingReady.json()).resolves.toMatchObject({
      status: 'draining',
      acceptingNewRooms: false,
      draining: true,
    })

    await host.disconnect()
    await draining
  })

  it('rejects new rooms while existing rooms can join, resume, and keep playing', async () => {
    const metricsToken = 'drain-test-metrics-token-at-least-32-bytes'
    server = await createRoomServer({ port: 0, drainTimeoutMs: 5_000, metricsToken })
    const host = await OperabilityClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'drain-host-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '排空主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected host session')

    const draining = server.beginDrain()
    const rejected = await OperabilityClient.connect(server.wsUrl)
    clients.push(rejected)
    rejected.send({
      type: 'create_room',
      requestId: 'drain-new-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '新建玩家',
      color: '#45b7d1',
    })
    await expect(
      rejected.next(message => message.type === 'error' && message.code === 'SERVER_DRAINING')
    ).resolves.toMatchObject({
      type: 'error',
      requestId: 'drain-new-create',
      code: 'SERVER_DRAINING',
    })

    const guest = await OperabilityClient.connect(server.wsUrl)
    clients.push(guest)
    guest.send({
      type: 'join_room',
      requestId: 'drain-existing-join',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: created.roomCode,
      nickname: '排空加入者',
      color: '#4ecdc4',
    })
    const joined = await guest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected guest session')
    await guest.disconnect()

    const resumed = await OperabilityClient.connect(server.wsUrl)
    clients.push(resumed)
    resumed.send({
      type: 'resume_room',
      requestId: 'drain-existing-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: joined.roomCode,
      playerId: joined.playerId,
      resumeToken: joined.resumeToken,
    })
    await expect(resumed.next(message => message.type === 'session')).resolves.toMatchObject({
      type: 'session',
      requestId: 'drain-existing-resume',
      playerId: joined.playerId,
    })

    host.send({ type: 'confirm_settings', requestId: 'drain-confirm-host' })
    resumed.send({ type: 'confirm_settings', requestId: 'drain-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'drain-start' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'playing'
    )
    resumed.send({
      type: 'submit_prediction',
      requestId: 'drain-action',
      prediction: 'high',
    })
    await expect(
      host.next(
        message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
      )
    ).resolves.toMatchObject({ type: 'room_state' })
    expect(server.getOperationalSnapshot()).toMatchObject({
      activeGames: 1,
      drainBlockingRooms: 1,
    })
    const metricsResponse = await fetch(`${httpBase(server)}/internal/metrics`, {
      headers: { authorization: `Bearer ${metricsToken}` },
    })
    const metrics = (await metricsResponse.json()) as {
      counters: Record<string, number>
    }
    expect(metrics.counters).toMatchObject({
      roomsCreatedTotal: 1,
      roomJoinsTotal: 1,
      roomResumesTotal: 1,
      gamesStartedTotal: 1,
    })

    await server.close()
    await draining
  })

  it('closes immediately without blockers and keeps repeated drain calls idempotent', async () => {
    server = await createRoomServer({ port: 0, drainTimeoutMs: 2_000 })

    const firstDrain = server.beginDrain()
    const secondDrain = server.beginDrain()

    expect(secondDrain).toBe(firstDrain)
    await firstDrain
    expect(server.isDraining()).toBe(true)
    await expect(fetch(`${httpBase(server)}/health`)).rejects.toThrow()
  })

  it('does not close an active room immediately and force-closes at the bounded timeout', async () => {
    server = await createRoomServer({ port: 0, drainTimeoutMs: 40 })
    const host = await OperabilityClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'timeout-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '超时测试玩家',
      color: '#ff6b6b',
    })
    await host.next(message => message.type === 'session')

    const startedAt = performance.now()
    const draining = server.beginDrain()
    await expect(
      Promise.race([draining.then(() => 'closed'), Promise.resolve('still-draining')])
    ).resolves.toBe('still-draining')
    await draining

    expect(performance.now() - startedAt).toBeLessThan(1_000)
    expect(server.getOperationalSnapshot().connections).toBe(0)
  })

  it('rejects zero, unbounded, and non-integer drain timeouts', async () => {
    await expect(createRoomServer({ port: 0, drainTimeoutMs: 0 })).rejects.toThrow('drainTimeoutMs')
    await expect(
      createRoomServer({ port: 0, drainTimeoutMs: Number.MAX_SAFE_INTEGER })
    ).rejects.toThrow('drainTimeoutMs')
    await expect(createRoomServer({ port: 0, drainTimeoutMs: 1.5 })).rejects.toThrow(
      'drainTimeoutMs'
    )
  })

  it('rejects unsafe service metadata before it can reach health or sessions', async () => {
    await expect(createRoomServer({ port: 0, version: 'unsafe version' })).rejects.toThrow(
      'ROOM_SERVER_VERSION'
    )
    await expect(createRoomServer({ port: 0, buildSha: 'not-a-public-commit' })).rejects.toThrow(
      'ROOM_SERVER_BUILD_SHA'
    )
  })

  it('hides metrics by default and exposes only authenticated aggregate allowlists', async () => {
    const metricsToken = 'synthetic-metrics-token-at-least-32-bytes'
    server = await createRoomServer({ port: 0, metricsToken })
    const baseUrl = httpBase(server)

    const missingToken = await fetch(`${baseUrl}/internal/metrics`)
    expect(missingToken.status).toBe(401)
    const wrongToken = await fetch(`${baseUrl}/internal/metrics`, {
      headers: { authorization: 'Bearer wrong-synthetic-token-at-least-32-bytes' },
    })
    expect(wrongToken.status).toBe(401)

    const host = await OperabilityClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'private-request-id',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: 'PrivateSynthetic',
      color: '#ff6b6b',
    })
    const session = await host.next(message => message.type === 'session')
    if (session.type !== 'session') throw new Error('expected session')

    const incompatible = await OperabilityClient.connect(server.wsUrl)
    clients.push(incompatible)
    incompatible.send({
      type: 'create_room',
      requestId: 'private-incompatible-request',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION + 1,
      nickname: 'PrivateMismatch',
      color: '#45b7d1',
    })
    await incompatible.next(
      message => message.type === 'error' && message.code === 'INCOMPATIBLE_PROTOCOL'
    )

    const response = await fetch(`${baseUrl}/internal/metrics`, {
      headers: { authorization: `Bearer ${metricsToken}` },
    })
    expect(response.status).toBe(200)
    const metrics = (await response.json()) as Record<string, unknown>
    expect(Object.keys(metrics)).toEqual(['schemaVersion', 'counters', 'gauges'])
    expect(Object.keys(metrics.counters as object)).toEqual([
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
    ])
    expect(Object.keys(metrics.gauges as object)).toEqual([
      'rooms',
      'activeGames',
      'connections',
      'drainBlockingRooms',
      'draining',
      'rssBytes',
      'uptimeSeconds',
    ])
    expect(metrics.counters).toMatchObject({
      connectionsOpenedTotal: 2,
      roomsCreatedTotal: 1,
      protocolRejectedTotal: 1,
    })
    const serialized = JSON.stringify(metrics)
    for (const privateValue of [
      'PrivateSynthetic',
      'PrivateMismatch',
      session.roomCode,
      session.playerId,
      session.resumeToken,
      'private-request-id',
      'private-incompatible-request',
      metricsToken,
    ]) {
      expect(serialized).not.toContain(privateValue)
    }
  })

  it('returns 404 for the metrics route when no token is configured', async () => {
    server = await createRoomServer({ port: 0 })

    const response = await fetch(`${httpBase(server)}/internal/metrics`)

    expect(response.status).toBe(404)
  })
})
