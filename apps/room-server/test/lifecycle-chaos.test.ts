import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import {
  CURRENT_ONLINE_PROTOCOL_VERSION,
  DEFAULT_ONLINE_ROOM_SETTINGS,
  type OnlineRoomView,
} from '@flying-chess/game-core'
import { createRoomServer, type RunningRoomServer } from '../src/server'
import type { ServerMessage } from '../src/protocol'

const quietEventDeck = [
  {
    id: 'quiet-chaos-test',
    title: '测试占位事件',
    description: '确定性 lifecycle 测试不触发事件',
    tags: ['test'],
    trigger: { kind: 'every_n_turns' as const, interval: 100 },
    effect: { kind: 'punishment_multiplier' as const, multiplier: 1, durationTurns: 1 },
  },
]

class ChaosClient {
  private readonly buffered: ServerMessage[] = []
  private readonly history: ServerMessage[] = []
  private readonly closed: Promise<void>
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean
    resolve: (message: ServerMessage) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }> = []

  private constructor(private readonly socket: WebSocket) {
    this.closed = new Promise(resolve => socket.once('close', resolve))
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString()) as ServerMessage
      this.history.push(message)
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

  static async connect(url: string): Promise<ChaosClient> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve)
      socket.once('error', reject)
    })
    return new ChaosClient(socket)
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message))
  }

  receivedMessages(): readonly ServerMessage[] {
    return this.history
  }

  waitForClose(): Promise<void> {
    return this.socket.readyState === WebSocket.CLOSED ? Promise.resolve() : this.closed
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
        reject(new Error('timed out waiting for deterministic room-server message'))
      }, timeoutMs)
      this.waiters.push({ predicate, resolve, reject, timer })
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return
    this.socket.close()
    await this.closed
  }
}

interface StartedRoom {
  readonly host: ChaosClient
  readonly guest: ChaosClient
  readonly hostSession: Extract<ServerMessage, { type: 'session' }>
  readonly guestSession: Extract<ServerMessage, { type: 'session' }>
}

async function createStartedRoom(
  server: RunningRoomServer,
  clients: ChaosClient[]
): Promise<StartedRoom> {
  const host = await ChaosClient.connect(server.wsUrl)
  const guest = await ChaosClient.connect(server.wsUrl)
  clients.push(host, guest)
  host.send({
    type: 'create_room',
    requestId: 'chaos-create',
    protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
    nickname: '主持人',
    color: '#ff6b6b',
  })
  const hostSession = await host.next(message => message.type === 'session')
  if (hostSession.type !== 'session') throw new Error('expected host session')
  guest.send({
    type: 'join_room',
    requestId: 'chaos-join',
    protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
    roomCode: hostSession.roomCode,
    nickname: '玩家二',
    color: '#4ecdc4',
  })
  const guestSession = await guest.next(message => message.type === 'session')
  if (guestSession.type !== 'session') throw new Error('expected guest session')
  host.send({ type: 'confirm_settings', requestId: 'chaos-confirm-host' })
  guest.send({ type: 'confirm_settings', requestId: 'chaos-confirm-guest' })
  await host.next(
    message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
  )
  host.send({ type: 'start_game', requestId: 'chaos-start' })
  await host.next(
    message => message.type === 'room_state' && message.room.game?.status === 'playing'
  )
  return { host, guest, hostSession, guestSession }
}

function expectValidPlayingProjection(room: OnlineRoomView): void {
  expect(room.status).toBe('playing')
  expect(room.game?.status).toBe('playing')
  expect(room.game?.players.some(player => player.id === room.game?.currentPlayerId)).toBe(true)
  expect(JSON.stringify(room).includes('resumeToken')).toBe(false)
}

async function advanceHostToMove(host: ChaosClient, guest: ChaosClient, prefix: string) {
  guest.send({
    type: 'submit_prediction',
    requestId: `${prefix}-prediction`,
    prediction: 'high',
  })
  await host.next(
    message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
  )
  host.send({ type: 'roll_dice', requestId: `${prefix}-roll` })
  await guest.next(
    message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_reaction'
  )
  guest.send({
    type: 'decide_reaction',
    requestId: `${prefix}-reaction`,
    decision: 'keep',
  })
  return host.next(
    message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
  )
}

describe('deterministic room lifecycle and chaos handling', () => {
  let server: RunningRoomServer | undefined
  const clients: ChaosClient[] = []
  const unhandledRejections: unknown[] = []
  const recordUnhandledRejection = (reason: unknown) => unhandledRejections.push(reason)

  beforeEach(() => {
    process.on('unhandledRejection', recordUnhandledRejection)
  })

  afterEach(async () => {
    process.off('unhandledRejection', recordUnhandledRejection)
    await Promise.allSettled(clients.map(client => client.disconnect()))
    clients.length = 0
    await server?.close()
    if (server) expect(server.getOperationalSnapshot().connections).toBe(0)
    expect(unhandledRejections).toEqual([])
    unhandledRejections.length = 0
  })

  it('applies a repeated move request at most once and returns a stable duplicate error', async () => {
    server = await createRoomServer({ port: 0, rollDice: () => 6, eventDeck: quietEventDeck })
    const { host, guest } = await createStartedRoom(server, clients)
    await advanceHostToMove(host, guest, 'duplicate')

    host.send({ type: 'move', requestId: 'same-move-request' })
    const moved = await host.next(
      message => message.type === 'room_state' && message.room.game?.players[0]?.position === 1
    )
    host.send({ type: 'move', requestId: 'same-move-request' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'same-move-request' &&
          message.code === 'DUPLICATE_REQUEST'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'DUPLICATE_REQUEST' })

    if (moved.type !== 'room_state') throw new Error('expected moved room state')
    expect(moved.room.game?.players[0]?.position).toBe(1)
    expectValidPlayingProjection(moved.room)
  })

  it('consumes a reroll token only once when the same request is delivered twice', async () => {
    server = await createRoomServer({ port: 0, rollDice: () => 6, eventDeck: quietEventDeck })
    const { host, guest } = await createStartedRoom(server, clients)
    await advanceHostToMove(host, guest, 'duplicate-reroll')

    host.send({ type: 'reroll', requestId: 'same-reroll-request' })
    const rerolled = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.phase === 'awaiting_move' &&
        message.room.game.myTokensRemaining === 0
    )
    host.send({ type: 'reroll', requestId: 'same-reroll-request' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'same-reroll-request' &&
          message.code === 'DUPLICATE_REQUEST'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'DUPLICATE_REQUEST' })

    if (rerolled.type !== 'room_state') throw new Error('expected rerolled room state')
    expect(rerolled.room.game?.myTokensRemaining).toBe(0)
    expectValidPlayingProjection(rerolled.room)
  })

  it('fails closed at request tracking capacity without forgetting the earliest accepted ID', async () => {
    server = await createRoomServer({
      port: 0,
      rollDice: () => 6,
      eventDeck: quietEventDeck,
      messagesPerSecond: 2_048,
      messageBurst: 2_048,
    })
    const host = await ChaosClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'capacity-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '容量主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected capacity host session')

    host.send({ type: 'confirm_settings', requestId: 'capacity-oldest-accepted-request' })
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.confirmedPlayerIds.includes(hostSession.playerId)
    )

    for (let index = 0; index < 1_023; index += 1) {
      host.send({ type: 'confirm_settings', requestId: `capacity-fill-${index}` })
    }
    host.send({ type: 'confirm_settings', requestId: 'capacity-overflow-request' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'capacity-overflow-request' &&
          message.code === 'REQUEST_TRACKING_LIMIT_REACHED',
        5_000
      )
    ).resolves.toMatchObject({ type: 'error', code: 'REQUEST_TRACKING_LIMIT_REACHED' })

    host.send({ type: 'confirm_settings', requestId: 'capacity-oldest-accepted-request' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'capacity-oldest-accepted-request' &&
          message.code === 'DUPLICATE_REQUEST'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'DUPLICATE_REQUEST' })

    const guest = await ChaosClient.connect(server.wsUrl)
    clients.push(guest)
    guest.send({
      type: 'join_room',
      requestId: 'capacity-state-probe',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: hostSession.roomCode,
      nickname: '容量玩家二',
      color: '#4ecdc4',
    })
    const guestSession = await guest.next(message => message.type === 'session')
    if (guestSession.type !== 'session') throw new Error('expected capacity guest session')
    const probed = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.players.some(player => player.id === guestSession.playerId)
    )
    if (probed.type !== 'room_state') throw new Error('expected capacity probe room state')
    expect(probed.room.status).toBe('lobby')
    expect(probed.room.players.some(player => player.id === probed.room.hostPlayerId)).toBe(true)
    expect(JSON.stringify(probed.room).includes('resumeToken')).toBe(false)
  })

  it('fences a stale socket after resume and sends the new private session only to its owner', async () => {
    let delayNextMessage = false
    let delayedMessageHandler: (() => void) | undefined
    let markDelayedMessageReceived: (() => void) | undefined
    const delayedMessageReceived = new Promise<void>(resolve => {
      markDelayedMessageReceived = resolve
    })
    server = await createRoomServer({
      port: 0,
      rollDice: () => 6,
      eventDeck: quietEventDeck,
      scheduleClientMessageHandling: callback => {
        if (!delayNextMessage) {
          callback()
          return
        }
        delayNextMessage = false
        delayedMessageHandler = callback
        markDelayedMessageReceived?.()
      },
    })
    const { host, guest, guestSession } = await createStartedRoom(server, clients)
    delayNextMessage = true
    guest.send({
      type: 'submit_prediction',
      requestId: 'stale-socket-late-prediction',
      prediction: 'high',
    })
    await delayedMessageReceived

    const resumed = await ChaosClient.connect(server.wsUrl)
    clients.push(resumed)
    resumed.send({
      type: 'resume_room',
      requestId: 'stale-socket-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: guestSession.roomCode,
      playerId: guestSession.playerId,
      resumeToken: guestSession.resumeToken,
    })
    const resumedSession = await resumed.next(message => message.type === 'session')
    if (resumedSession.type !== 'session') throw new Error('expected resumed session')

    if (!delayedMessageHandler) throw new Error('expected delayed stale message handler')
    delayedMessageHandler()
    await guest.waitForClose()
    resumed.send({ type: 'pause_game', requestId: 'stale-socket-state-probe' })
    const probed = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.pauseRequestedPlayerIds.includes(guestSession.playerId)
    )
    if (probed.type !== 'room_state') throw new Error('expected probed room state')
    expect(probed.room.game?.phase).toBe('awaiting_prediction')
    expectValidPlayingProjection(probed.room)

    const serializedHost = JSON.stringify(host.receivedMessages())
    const serializedStaleGuest = JSON.stringify(guest.receivedMessages())
    const serializedResumed = JSON.stringify(resumed.receivedMessages())
    expect(serializedHost.includes(resumedSession.resumeToken)).toBe(false)
    expect(serializedStaleGuest.includes(resumedSession.resumeToken)).toBe(false)
    expect(serializedResumed.includes(resumedSession.resumeToken)).toBe(true)

    resumed.send({
      type: 'submit_prediction',
      requestId: 'resumed-socket-valid-prediction',
      prediction: 'high',
    })
    await expect(
      host.next(
        message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
      )
    ).resolves.toMatchObject({ type: 'room_state' })
  })

  it('preserves a private RPS action across disconnects without exposing the hidden choice', async () => {
    server = await createRoomServer({
      port: 0,
      rollDice: () => 6,
      eventDeck: [
        {
          id: 'chaos-private-rps',
          title: '全员猜拳',
          description: '秘密出拳后统一揭晓',
          tags: ['test'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'rock_paper_scissors' },
        },
      ],
    })
    const { host, guest, guestSession } = await createStartedRoom(server, clients)
    await advanceHostToMove(host, guest, 'private-rps')
    host.send({ type: 'move', requestId: 'private-rps-move' })
    await guest.next(
      message =>
        message.type === 'room_state' && message.room.game?.pendingAction?.kind === 'event_rps'
    )

    await guest.disconnect()
    const firstResume = await ChaosClient.connect(server.wsUrl)
    clients.push(firstResume)
    firstResume.send({
      type: 'resume_room',
      requestId: 'private-rps-first-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: guestSession.roomCode,
      playerId: guestSession.playerId,
      resumeToken: guestSession.resumeToken,
    })
    const firstResumedSession = await firstResume.next(message => message.type === 'session')
    if (firstResumedSession.type !== 'session') throw new Error('expected first resumed session')
    await firstResume.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.pendingAction?.kind === 'event_rps' &&
        message.room.game.allowedCommands.includes('rps')
    )

    firstResume.send({ type: 'rps', requestId: 'private-rps-choice', choice: 'scissors' })
    const publicSubmission = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.pendingAction?.kind === 'event_rps' &&
        message.room.game.pendingAction.submittedCount === 1
    )
    expect(JSON.stringify(publicSubmission).includes('scissors')).toBe(false)
    expect(JSON.stringify(publicSubmission).includes('choices')).toBe(false)

    await firstResume.disconnect()
    const secondResume = await ChaosClient.connect(server.wsUrl)
    clients.push(secondResume)
    secondResume.send({
      type: 'resume_room',
      requestId: 'private-rps-second-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: firstResumedSession.roomCode,
      playerId: firstResumedSession.playerId,
      resumeToken: firstResumedSession.resumeToken,
    })
    await secondResume.next(message => message.type === 'session')
    const restoredPrivateView = await secondResume.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.pendingAction?.kind === 'event_rps' &&
        message.room.game.pendingAction.hasSubmitted === true
    )
    expect(JSON.stringify(restoredPrivateView).includes('scissors')).toBe(false)
    if (restoredPrivateView.type !== 'room_state') throw new Error('expected restored room state')
    expect(restoredPrivateView.room.game?.allowedCommands.includes('rps')).toBe(false)
    expectValidPlayingProjection(restoredPrivateView.room)

    host.send({ type: 'rps', requestId: 'private-rps-host-choice', choice: 'rock' })
    await expect(
      secondResume.next(
        message =>
          message.type === 'room_state' && message.room.game?.pendingAction?.kind === 'event_result'
      )
    ).resolves.toMatchObject({ type: 'room_state' })
  })

  it('transfers host once at grace expiry and never lets the original host reclaim it on resume', async () => {
    let now = 1_000
    let runMaintenance: (() => void) | undefined
    let maintenanceStopped = false
    server = await createRoomServer({
      port: 0,
      now: () => now,
      reconnectGraceMs: 100,
      rollDice: () => 6,
      eventDeck: quietEventDeck,
      scheduleGameMaintenance: callback => {
        runMaintenance = callback
        return () => {
          maintenanceStopped = true
        }
      },
    })
    const { host, guest, hostSession, guestSession } = await createStartedRoom(server, clients)
    await host.disconnect()
    now += 100
    if (!runMaintenance) throw new Error('expected deterministic maintenance callback')
    runMaintenance()

    const transferred = await guest.next(
      message =>
        message.type === 'room_state' && message.room.hostPlayerId === guestSession.playerId
    )
    if (transferred.type !== 'room_state') throw new Error('expected transferred room state')
    expect(
      transferred.room.players.filter(player => player.id === transferred.room.hostPlayerId)
    ).toHaveLength(1)
    expectValidPlayingProjection(transferred.room)

    const originalHostResumed = await ChaosClient.connect(server.wsUrl)
    clients.push(originalHostResumed)
    originalHostResumed.send({
      type: 'resume_room',
      requestId: 'host-race-resume-original',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: hostSession.roomCode,
      playerId: hostSession.playerId,
      resumeToken: hostSession.resumeToken,
    })
    const resumedSession = await originalHostResumed.next(message => message.type === 'session')
    if (resumedSession.type !== 'session') throw new Error('expected original host resume session')
    expect(resumedSession.isHost).toBe(false)
    const resumedRoom = await originalHostResumed.next(
      message =>
        message.type === 'room_state' && message.room.hostPlayerId === guestSession.playerId
    )
    if (resumedRoom.type !== 'room_state') throw new Error('expected resumed room state')
    expect(
      resumedRoom.room.players.filter(player => player.id === resumedRoom.room.hostPlayerId)
    ).toHaveLength(1)

    originalHostResumed.send({
      type: 'transfer_host',
      requestId: 'host-race-old-host-transfer',
      playerId: hostSession.playerId,
    })
    await expect(
      originalHostResumed.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'host-race-old-host-transfer' &&
          message.code === 'HOST_ONLY'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'HOST_ONLY' })

    await server.close()
    expect(maintenanceStopped).toBe(true)
  })

  it('applies the user action once when it reaches the deadline boundary before the timer tick', async () => {
    let now = 1_000
    let runMaintenance: (() => void) | undefined
    server = await createRoomServer({
      port: 0,
      now: () => now,
      rollDice: () => 6,
      eventDeck: quietEventDeck,
      scheduleGameMaintenance: callback => {
        runMaintenance = callback
        return () => undefined
      },
    })
    const { host, guest, guestSession } = await createStartedRoom(server, clients)
    const waiting = await guest.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )
    if (waiting.type !== 'room_state' || waiting.room.game?.deadlineAt == null) {
      throw new Error('expected prediction deadline')
    }
    now = waiting.room.game.deadlineAt

    guest.send({
      type: 'submit_prediction',
      requestId: 'race-action-first-prediction',
      prediction: 'high',
    })
    const actionResult = await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    if (!runMaintenance) throw new Error('expected deterministic maintenance callback')
    runMaintenance()
    guest.send({ type: 'pause_game', requestId: 'race-action-first-probe' })
    const probed = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.pauseRequestedPlayerIds.includes(guestSession.playerId)
    )
    if (actionResult.type !== 'room_state' || probed.type !== 'room_state') {
      throw new Error('expected action-first room states')
    }
    expect(probed.room.game?.phase).toBe('awaiting_roll')
    expect(probed.room.game?.revision).toBe(actionResult.room.game?.revision)
    expect(probed.room.game?.pendingAction).toBeNull()
    expectValidPlayingProjection(probed.room)
  })

  it('applies the timeout once and rejects the late user action at the same deadline boundary', async () => {
    let now = 1_000
    let runMaintenance: (() => void) | undefined
    server = await createRoomServer({
      port: 0,
      now: () => now,
      rollDice: () => 6,
      eventDeck: quietEventDeck,
      scheduleGameMaintenance: callback => {
        runMaintenance = callback
        return () => undefined
      },
    })
    const { host, guest, guestSession } = await createStartedRoom(server, clients)
    const waiting = await guest.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )
    if (waiting.type !== 'room_state' || waiting.room.game?.deadlineAt == null) {
      throw new Error('expected prediction deadline')
    }
    now = waiting.room.game.deadlineAt
    if (!runMaintenance) throw new Error('expected deterministic maintenance callback')
    runMaintenance()
    const timeoutResult = await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )

    guest.send({
      type: 'submit_prediction',
      requestId: 'race-timeout-first-late-prediction',
      prediction: 'high',
    })
    await expect(
      guest.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'race-timeout-first-late-prediction' &&
          message.code === 'INVALID_PHASE'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'INVALID_PHASE' })
    guest.send({ type: 'pause_game', requestId: 'race-timeout-first-probe' })
    const probed = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.pauseRequestedPlayerIds.includes(guestSession.playerId)
    )
    if (timeoutResult.type !== 'room_state' || probed.type !== 'room_state') {
      throw new Error('expected timeout-first room states')
    }
    expect(probed.room.game?.phase).toBe('awaiting_roll')
    expect(probed.room.game?.revision).toBe(timeoutResult.room.game?.revision)
    expect(probed.room.game?.pendingAction).toBeNull()
    expectValidPlayingProjection(probed.room)
  })

  it('drains deterministically while an existing room joins, resumes, plays, and finishes once', async () => {
    let now = 0
    const diceValues = [6, 6, 2, 5]
    const metricsToken = 'FAKE_METRICS_TOKEN_FOR_CHAOS_TEST_ONLY_32_BYTES'
    server = await createRoomServer({
      port: 0,
      now: () => now,
      rollDice: () => diceValues.shift() ?? 1,
      eventDeck: quietEventDeck,
      drainTimeoutMs: 5_000,
      metricsToken,
      scheduleGameMaintenance: () => () => undefined,
    })
    const host = await ChaosClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'drain-chaos-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '排空主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected drain host session')

    const draining = server.beginDrain()
    const baseUrl = server.wsUrl.replace('ws://', 'http://')
    const health = await fetch(`${baseUrl}/health`)
    const ready = await fetch(`${baseUrl}/ready`)
    expect(health.status).toBe(200)
    expect(ready.status).toBe(503)

    const rejected = await ChaosClient.connect(server.wsUrl)
    clients.push(rejected)
    rejected.send({
      type: 'create_room',
      requestId: 'drain-chaos-rejected-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '排空后新玩家',
      color: '#45b7d1',
    })
    await expect(
      rejected.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'drain-chaos-rejected-create' &&
          message.code === 'SERVER_DRAINING'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'SERVER_DRAINING' })

    const guest = await ChaosClient.connect(server.wsUrl)
    clients.push(guest)
    guest.send({
      type: 'join_room',
      requestId: 'drain-chaos-existing-join',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: hostSession.roomCode,
      nickname: '排空房间玩家二',
      color: '#4ecdc4',
    })
    const guestSession = await guest.next(message => message.type === 'session')
    if (guestSession.type !== 'session') throw new Error('expected drain guest session')
    host.send({
      type: 'update_settings',
      requestId: 'drain-chaos-settings',
      settings: {
        ...DEFAULT_ONLINE_ROOM_SETTINGS,
        boardConfig: {
          punishmentCells: 0,
          chainPunishmentCells: 0,
          bonusCells: 0,
          reverseCells: 0,
          restCells: 0,
          restartCells: 0,
          trapCells: 0,
          qaCells: 0,
          dareCells: 0,
          totalCells: 20,
        },
      },
    })
    await host.next(
      message =>
        message.type === 'room_state' && message.room.settings.boardConfig.totalCells === 20
    )

    await guest.disconnect()
    const resumed = await ChaosClient.connect(server.wsUrl)
    clients.push(resumed)
    resumed.send({
      type: 'resume_room',
      requestId: 'drain-chaos-existing-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: guestSession.roomCode,
      playerId: guestSession.playerId,
      resumeToken: guestSession.resumeToken,
    })
    await resumed.next(message => message.type === 'session')
    host.send({ type: 'confirm_settings', requestId: 'drain-chaos-confirm-host' })
    resumed.send({ type: 'confirm_settings', requestId: 'drain-chaos-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'drain-chaos-start' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )

    now = 20 * 60_000 + 1
    resumed.send({
      type: 'submit_prediction',
      requestId: 'drain-chaos-prediction',
      prediction: 'high',
    })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    host.send({ type: 'roll_dice', requestId: 'drain-chaos-host-roll' })
    await resumed.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_reaction'
    )
    resumed.send({
      type: 'decide_reaction',
      requestId: 'drain-chaos-reaction',
      decision: 'keep',
    })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
    )
    host.send({ type: 'move', requestId: 'drain-chaos-host-move' })
    await resumed.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    resumed.send({ type: 'roll_dice', requestId: 'drain-chaos-guest-roll' })
    await resumed.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
    )
    resumed.send({ type: 'move', requestId: 'drain-chaos-guest-move' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_tiebreak'
    )
    host.send({ type: 'tiebreak_roll', requestId: 'drain-chaos-host-tiebreak' })
    await resumed.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.phase === 'awaiting_tiebreak' &&
        message.room.game.currentPlayerId === guestSession.playerId
    )
    resumed.send({ type: 'tiebreak_roll', requestId: 'drain-chaos-final-tiebreak' })
    const finished = await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'finished'
    )
    if (finished.type !== 'room_state') throw new Error('expected finished room state')
    expect(finished.room.status).toBe('finished')
    expect(finished.room.game?.status).toBe('finished')

    resumed.send({ type: 'tiebreak_roll', requestId: 'drain-chaos-final-tiebreak' })
    await expect(
      resumed.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'drain-chaos-final-tiebreak' &&
          message.code === 'DUPLICATE_REQUEST'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'DUPLICATE_REQUEST' })
    const metricsResponse = await fetch(`${baseUrl}/internal/metrics`, {
      headers: { authorization: `Bearer ${metricsToken}` },
    })
    await expect(metricsResponse.json()).resolves.toMatchObject({
      counters: { gamesFinishedTotal: 1 },
    })

    await Promise.all([host.disconnect(), resumed.disconnect()])
    await draining
    expect(server.getOperationalSnapshot()).toMatchObject({
      activeGames: 0,
      connections: 0,
      drainBlockingRooms: 0,
    })
  })
})
