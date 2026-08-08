import { afterEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import {
  CURRENT_ONLINE_PROTOCOL_VERSION,
  DEFAULT_ONLINE_ROOM_SETTINGS,
  type OnlineRoomSettings,
} from '@flying-chess/game-core'
import { createRoomServer, type RunningRoomServer } from '../src/server'
import { verifyGameCompletionClaim } from '../src/gameCompletionClaims'
import type { ServerMessage } from '../src/protocol'

const quietEventDeck = [
  {
    id: 'quiet-server-test',
    title: '测试占位事件',
    description: '本测试不会触发',
    tags: ['test'],
    trigger: { kind: 'every_n_turns' as const, interval: 100 },
    effect: { kind: 'punishment_multiplier' as const, multiplier: 1, durationTurns: 1 },
  },
]

class TestClient {
  private readonly messages: ServerMessage[] = []
  private readonly waiters: Array<{
    predicate: (message: ServerMessage) => boolean
    resolve: (message: ServerMessage) => void
  }> = []

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', raw => {
      const message = JSON.parse(raw.toString()) as ServerMessage
      const waiterIndex = this.waiters.findIndex(waiter => waiter.predicate(message))
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1)
        waiter.resolve(message)
      } else {
        this.messages.push(message)
      }
    })
  }

  static async connect(url: string): Promise<TestClient> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.once('open', resolve)
      socket.once('error', reject)
    })
    return new TestClient(socket)
  }

  send(message: object): void {
    this.socket.send(JSON.stringify(message))
  }

  next(predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> {
    const bufferedIndex = this.messages.findIndex(predicate)
    if (bufferedIndex >= 0) {
      const [message] = this.messages.splice(bufferedIndex, 1)
      return Promise.resolve(message)
    }
    return new Promise(resolve => this.waiters.push({ predicate, resolve }))
  }

  close(): void {
    this.socket.close()
  }

  async disconnect(): Promise<void> {
    const closed = new Promise<void>(resolve => this.socket.once('close', () => resolve()))
    this.socket.close()
    await closed
  }
}

describe('联网升温局服务器权威纵向切片', () => {
  let server: RunningRoomServer | undefined
  const clients: TestClient[] = []

  afterEach(async () => {
    clients.forEach(client => client.close())
    await server?.close()
  })

  it('健康指标统计所有已建立连接，包括尚未加入房间的连接', async () => {
    server = await createRoomServer({ port: 0 })
    const idleClient = await TestClient.connect(server.wsUrl)
    clients.push(idleClient)

    const response = await fetch(`${server.wsUrl.replace('ws://', 'http://')}/health`)
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      rooms: 0,
      connections: 1,
    })
  })

  it('使用当前协议建房并在私有 session 中返回协议与服务版本', async () => {
    server = await createRoomServer({ port: 0, version: '1.15.0', buildSha: 'abc1234' })
    const host = await TestClient.connect(server.wsUrl)
    clients.push(host)

    host.send({
      type: 'create_room',
      requestId: 'versioned-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '协议测试玩家',
      color: '#ff6b6b',
    })

    await expect(host.next(message => message.type === 'session')).resolves.toMatchObject({
      type: 'session',
      requestId: 'versioned-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      serverVersion: '1.15.0',
      serverBuildSha: 'abc1234',
    })
  })

  it('使用当前协议加入和恢复原席位，且不会向其他玩家投影私有 session 字段', async () => {
    server = await createRoomServer({ port: 0, version: '1.15.0' })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)

    host.send({
      type: 'create_room',
      requestId: 'protocol-create-host',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: '协议主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected host session')

    guest.send({
      type: 'join_room',
      requestId: 'protocol-join-guest',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: created.roomCode,
      nickname: '协议加入者',
      color: '#4ecdc4',
    })
    const joined = await guest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected guest session')
    expect(joined.protocolVersion).toBe(CURRENT_ONLINE_PROTOCOL_VERSION)
    const hostProjection = await host.next(
      message => message.type === 'room_state' && message.room.players.length === 2
    )
    expect(JSON.stringify(hostProjection)).not.toContain(joined.resumeToken)

    await guest.disconnect()
    const resumed = await TestClient.connect(server.wsUrl)
    clients.push(resumed)
    resumed.send({
      type: 'resume_room',
      requestId: 'protocol-resume-guest',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: joined.roomCode,
      playerId: joined.playerId,
      resumeToken: joined.resumeToken,
    })

    await expect(resumed.next(message => message.type === 'session')).resolves.toMatchObject({
      type: 'session',
      requestId: 'protocol-resume-guest',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      serverVersion: '1.15.0',
      playerId: joined.playerId,
    })
  })

  it('协议 1 继续兼容缺少协议字段的旧客户端建房、加入、操作和恢复', async () => {
    server = await createRoomServer({ port: 0 })
    const legacyHost = await TestClient.connect(server.wsUrl)
    const legacyGuest = await TestClient.connect(server.wsUrl)
    clients.push(legacyHost, legacyGuest)

    legacyHost.send({
      type: 'create_room',
      requestId: 'legacy-create',
      nickname: '旧页面玩家',
      color: '#ff6b6b',
    })

    const created = await legacyHost.next(message => message.type === 'session')
    expect(created).toMatchObject({
      type: 'session',
      requestId: 'legacy-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
    })
    if (created.type !== 'session') throw new Error('expected legacy host session')

    legacyGuest.send({
      type: 'join_room',
      requestId: 'legacy-join',
      roomCode: created.roomCode,
      nickname: '旧页面加入者',
      color: '#4ecdc4',
    })
    const joined = await legacyGuest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected legacy guest session')

    legacyHost.send({ type: 'confirm_settings', requestId: 'legacy-confirm-host' })
    legacyGuest.send({ type: 'confirm_settings', requestId: 'legacy-confirm-guest' })
    await legacyHost.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    legacyHost.send({ type: 'start_game', requestId: 'legacy-start' })
    await legacyHost.next(
      message => message.type === 'room_state' && message.room.game?.rulesetVersion === 'party_v3'
    )

    await legacyGuest.disconnect()
    const resumedGuest = await TestClient.connect(server.wsUrl)
    clients.push(resumedGuest)
    resumedGuest.send({
      type: 'resume_room',
      requestId: 'legacy-resume',
      roomCode: joined.roomCode,
      playerId: joined.playerId,
      resumeToken: joined.resumeToken,
    })
    await expect(resumedGuest.next(message => message.type === 'session')).resolves.toMatchObject({
      type: 'session',
      requestId: 'legacy-resume',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      playerId: joined.playerId,
    })
  })

  it.each([
    ['too old', 0],
    ['too new', CURRENT_ONLINE_PROTOCOL_VERSION + 1],
    ['string', '1'],
    ['fraction', 1.5],
    ['negative', -1],
    ['NaN', Number.NaN],
    ['extremely large', Number.MAX_VALUE],
  ])('拒绝 %s 的显式协议版本', async (_label, protocolVersion) => {
    server = await createRoomServer({ port: 0 })
    const client = await TestClient.connect(server.wsUrl)
    clients.push(client)
    client.send({
      type: 'create_room',
      requestId: 'incompatible-create',
      protocolVersion,
      nickname: '不兼容页面',
      color: '#ff6b6b',
    })

    await expect(
      client.next(message => message.type === 'error' && message.code === 'INCOMPATIBLE_PROTOCOL')
    ).resolves.toMatchObject({
      type: 'error',
      requestId: 'incompatible-create',
      code: 'INCOMPATIBLE_PROTOCOL',
      message: '联机协议版本不兼容，请刷新页面或关闭后重新打开。',
    })
  })

  it('三个玩家通过 WebSocket 建房加入后，由服务器判定掷骰与移动并同步给所有客户端', async () => {
    server = await createRoomServer({ port: 0, rollDice: () => 6, eventDeck: quietEventDeck })
    const host = await TestClient.connect(server.wsUrl)
    const playerTwo = await TestClient.connect(server.wsUrl)
    const playerThree = await TestClient.connect(server.wsUrl)
    clients.push(host, playerTwo, playerThree)

    host.send({
      type: 'create_room',
      requestId: 'create-1',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    expect(created).toMatchObject({
      type: 'session',
      requestId: 'create-1',
      isHost: true,
      roomCode: expect.stringMatching(/^[A-Z2-9]{6}$/),
    })
    if (created.type !== 'session') throw new Error('expected session')

    playerTwo.send({
      type: 'join_room',
      requestId: 'join-2',
      roomCode: created.roomCode,
      nickname: '玩家二',
      color: '#4ecdc4',
    })
    const joinedTwo = await playerTwo.next(message => message.type === 'session')
    playerThree.send({
      type: 'join_room',
      requestId: 'join-3',
      roomCode: created.roomCode,
      nickname: '玩家三',
      color: '#45b7d1',
    })
    await playerThree.next(message => message.type === 'session')

    for (const [index, client] of [host, playerTwo, playerThree].entries()) {
      client.send({ type: 'confirm_settings', requestId: `slice-confirm-${index}` })
    }
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )

    host.send({ type: 'start_game', requestId: 'start-1' })
    const started = await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'playing'
    )
    expect(started).toMatchObject({
      type: 'room_state',
      room: {
        players: [{ nickname: '主持人' }, { nickname: '玩家二' }, { nickname: '玩家三' }],
        game: {
          phase: 'awaiting_prediction',
        },
      },
    })

    playerTwo.send({
      type: 'submit_prediction',
      requestId: 'predict-1',
      prediction: 'high',
    })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )

    host.send({ type: 'roll_dice', requestId: 'roll-1' })
    const rolledViews = await Promise.all(
      [host, playerTwo, playerThree].map(client =>
        client.next(
          message =>
            message.type === 'room_state' &&
            message.room.game?.phase === 'awaiting_reaction' &&
            message.room.game.diceValue === 6
        )
      )
    )
    expect(rolledViews).toHaveLength(3)

    playerTwo.send({
      type: 'decide_reaction',
      requestId: 'reaction-1',
      decision: 'keep',
    })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
    )

    host.send({ type: 'move', requestId: 'move-1' })
    const movedViews = await Promise.all(
      [host, playerTwo, playerThree].map(client =>
        client.next(
          message =>
            message.type === 'room_state' &&
            message.room.game?.phase === 'awaiting_roll' &&
            message.room.game.players[0]?.position === 1
        )
      )
    )
    expect(movedViews).toHaveLength(3)
    const playerTwoView = movedViews[1]
    expect(playerTwoView).toMatchObject({
      type: 'room_state',
      room: {
        game: {
          currentPlayerId: joinedTwo.type === 'session' ? joinedTwo.playerId : expect.any(String),
        },
      },
    })
    if (playerTwoView.type !== 'room_state') throw new Error('expected room state')
    expect(playerTwoView.room.game?.allowedCommands).toContain('roll_dice')
  })

  it('权威完成只增加一次 Momentum，并在去重、转交、暂停和断线恢复后完整保留', async () => {
    server = await createRoomServer({
      port: 0,
      rollDice: () => 1,
      randomInt: (_minimum, maximum) => maximum,
      eventDeck: quietEventDeck,
    })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)

    host.send({
      type: 'create_room',
      requestId: 'momentum-create',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      nickname: 'Momentum 主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected host session')
    guest.send({
      type: 'join_room',
      requestId: 'momentum-join',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: hostSession.roomCode,
      nickname: 'Momentum 玩家二',
      color: '#4ecdc4',
    })
    const guestSession = await guest.next(message => message.type === 'session')
    if (guestSession.type !== 'session') throw new Error('expected guest session')

    host.send({ type: 'confirm_settings', requestId: 'momentum-confirm-host' })
    guest.send({ type: 'confirm_settings', requestId: 'momentum-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'momentum-start' })
    const started = await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'playing'
    )
    expect(started).toMatchObject({
      type: 'room_state',
      room: {
        game: {
          rulesetVersion: 'party_v3',
          heat: 0,
          heatContributionByPlayer: [0, 0],
          heatLimitPending: false,
          myTokensRemaining: 1,
        },
      },
    })

    guest.send({
      type: 'submit_prediction',
      requestId: 'momentum-predict',
      prediction: 'high',
    })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    host.send({ type: 'roll_dice', requestId: 'momentum-roll' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
    )
    host.send({ type: 'move', requestId: 'momentum-move' })
    const offered = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.game?.phase === 'awaiting_punishment_intervention'
    )
    expect(offered).toMatchObject({ type: 'room_state', room: { game: { heat: 0 } } })

    host.send({ type: 'decline_intervention', requestId: 'momentum-decline-host' })
    guest.send({ type: 'decline_intervention', requestId: 'momentum-decline-guest' })
    await host.next(
      message =>
        message.type === 'room_state' && message.room.game?.phase === 'awaiting_acknowledgement'
    )

    host.send({ type: 'acknowledge', requestId: 'momentum-ack' })
    const [hostCompleted, guestCompleted] = await Promise.all(
      [host, guest].map(client =>
        client.next(message => message.type === 'room_state' && message.room.game?.heat === 5)
      )
    )
    for (const completed of [hostCompleted, guestCompleted]) {
      expect(completed).toMatchObject({
        type: 'room_state',
        room: {
          game: {
            heat: 5,
            heatContributionByPlayer: [5, 0],
            heatLimitPending: false,
            myTokensRemaining: 1,
          },
        },
      })
    }

    host.send({ type: 'acknowledge', requestId: 'momentum-ack' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'momentum-ack' &&
          message.code === 'DUPLICATE_REQUEST'
      )
    ).resolves.toMatchObject({ type: 'error', code: 'DUPLICATE_REQUEST' })

    host.send({
      type: 'transfer_host',
      requestId: 'momentum-transfer-host',
      playerId: guestSession.playerId,
    })
    const transferred = await guest.next(
      message =>
        message.type === 'room_state' && message.room.hostPlayerId === guestSession.playerId
    )
    expect(transferred).toMatchObject({ type: 'room_state', room: { game: { heat: 5 } } })

    guest.send({ type: 'pause_game', requestId: 'momentum-pause' })
    await expect(
      host.next(message => message.type === 'room_state' && message.room.game?.paused === true)
    ).resolves.toMatchObject({ type: 'room_state', room: { game: { heat: 5 } } })
    guest.send({ type: 'resume_game', requestId: 'momentum-resume-game' })
    await expect(
      host.next(
        message =>
          message.type === 'room_state' &&
          message.room.hostPlayerId === guestSession.playerId &&
          message.room.game?.paused === false &&
          message.room.game.heat === 5
      )
    ).resolves.toMatchObject({ type: 'room_state', room: { game: { heat: 5 } } })

    await guest.disconnect()
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.players.some(
          player => player.id === guestSession.playerId && !player.connected
        )
    )
    const resumedGuest = await TestClient.connect(server.wsUrl)
    clients.push(resumedGuest)
    resumedGuest.send({
      type: 'resume_room',
      requestId: 'momentum-resume-room',
      protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
      roomCode: guestSession.roomCode,
      playerId: guestSession.playerId,
      resumeToken: guestSession.resumeToken,
    })
    await expect(resumedGuest.next(message => message.type === 'session')).resolves.toMatchObject({
      type: 'session',
      requestId: 'momentum-resume-room',
      playerId: guestSession.playerId,
      isHost: true,
    })
    const recovered = await resumedGuest.next(
      message => message.type === 'room_state' && message.room.game?.heat === 5
    )
    expect(recovered).toMatchObject({
      type: 'room_state',
      room: {
        game: {
          heat: 5,
          heatContributionByPlayer: [5, 0],
          myTokensRemaining: 1,
        },
      },
    })
    if (recovered.type !== 'room_state' || !recovered.room.game) {
      throw new Error('expected recovered room game')
    }
    const serializedGame = JSON.stringify(recovered.room.game)
    expect(serializedGame).not.toContain('tokensRemaining')
    expect(serializedGame).not.toContain('resumeToken')
    expect(serializedGame).not.toContain('deferredPunishments')
    expect(serializedGame).not.toContain('eventQueue')
  })

  it('heat 100 先保留同轮后续玩家回合，再在完整轮边界进入现有结算', async () => {
    server = await createRoomServer({
      port: 0,
      rollDice: () => 1,
      randomInt: (_minimum, maximum) => maximum,
      eventDeck: quietEventDeck,
      messagesPerSecond: 10_000,
      messageBurst: 10_000,
    })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)

    host.send({
      type: 'create_room',
      requestId: 'limit-create',
      nickname: '热度主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected host session')
    host.send({
      type: 'update_settings',
      requestId: 'limit-settings',
      settings: {
        ...DEFAULT_ONLINE_ROOM_SETTINGS,
        boardConfig: {
          punishmentCells: 38,
          chainPunishmentCells: 0,
          bonusCells: 0,
          reverseCells: 0,
          restCells: 0,
          restartCells: 0,
          trapCells: 0,
          qaCells: 0,
          dareCells: 0,
          totalCells: 40,
        },
        punishmentConfig: {
          ...DEFAULT_ONLINE_ROOM_SETTINGS.punishmentConfig,
          maxTakeoffFailures: 10,
          doublePunishmentChance: 0,
        },
      },
    })
    await host.next(
      message =>
        message.type === 'room_state' && message.room.settings.boardConfig.punishmentCells === 38
    )
    guest.send({
      type: 'join_room',
      requestId: 'limit-join',
      roomCode: hostSession.roomCode,
      nickname: '热度玩家二',
      color: '#4ecdc4',
    })
    const guestSession = await guest.next(message => message.type === 'session')
    if (guestSession.type !== 'session') throw new Error('expected guest session')
    const clientByPlayerId = new Map([
      [hostSession.playerId, host],
      [guestSession.playerId, guest],
    ])

    host.send({ type: 'confirm_settings', requestId: 'limit-confirm-host' })
    guest.send({ type: 'confirm_settings', requestId: 'limit-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'limit-start' })
    const started = await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'playing'
    )
    if (started.type !== 'room_state' || !started.room.game) {
      throw new Error('expected started game')
    }
    let state = started.room.game
    const currentPhase = () => state.phase
    let sequence = 0
    const nextState = async () => {
      const previousRevision = state.revision
      const update = await host.next(
        message =>
          message.type === 'room_state' &&
          Boolean(message.room.game && message.room.game.revision > previousRevision)
      )
      if (update.type !== 'room_state' || !update.room.game) {
        throw new Error('expected game update')
      }
      state = update.room.game
    }
    const sendAs = (playerId: string, message: object) => {
      const client = clientByPlayerId.get(playerId)
      if (!client) throw new Error('expected connected test player')
      client.send(message)
    }
    const completePunishmentTurn = async () => {
      if (state.phase === 'awaiting_prediction') {
        const reactorId = state.reaction?.reactorPlayerId
        if (!reactorId) throw new Error('expected reaction player')
        sendAs(reactorId, {
          type: 'submit_prediction',
          requestId: `limit-predict-${sequence++}`,
          prediction: state.roundNumber <= 4 ? 'low' : 'high',
        })
        await nextState()
      }

      const actorId = state.currentPlayerId
      sendAs(actorId, { type: 'roll_dice', requestId: `limit-roll-${sequence++}` })
      await nextState()
      if (state.phase === 'awaiting_reaction') {
        const reactorId = state.reaction?.reactorPlayerId
        if (!reactorId) throw new Error('expected successful reaction player')
        sendAs(reactorId, {
          type: 'decide_reaction',
          requestId: `limit-reaction-${sequence++}`,
          decision: 'keep',
        })
        await nextState()
      }
      expect(state.phase).toBe('awaiting_move')

      sendAs(actorId, { type: 'move', requestId: `limit-move-${sequence++}` })
      await nextState()
      if (state.phase === 'awaiting_punishment_choice') {
        sendAs(actorId, {
          type: 'choose_punishment',
          requestId: `limit-choice-${sequence++}`,
          selectedIndex: null,
        })
        await nextState()
      }
      if (state.phase !== 'awaiting_punishment_intervention') {
        expect(['awaiting_prediction', 'awaiting_roll']).toContain(state.phase)
        return
      }
      expect(state.phase).toBe('awaiting_punishment_intervention')

      sendAs(actorId, {
        type: 'decline_intervention',
        requestId: `limit-decline-actor-${sequence++}`,
      })
      await nextState()
      const otherPlayerId =
        actorId === hostSession.playerId ? guestSession.playerId : hostSession.playerId
      sendAs(otherPlayerId, {
        type: 'decline_intervention',
        requestId: `limit-decline-other-${sequence++}`,
      })
      await nextState()
      while (
        currentPhase() === 'awaiting_punishment_count' ||
        currentPhase() === 'awaiting_punishment_variant'
      ) {
        host.send({ type: 'skip_action', requestId: `limit-resolve-${sequence++}` })
        await nextState()
      }
      expect(state.phase).toBe('awaiting_acknowledgement')

      while (currentPhase() === 'awaiting_acknowledgement') {
        host.send({ type: 'skip_action', requestId: `limit-ack-${sequence++}` })
        await nextState()
      }
    }

    while (state.heat < 100) await completePunishmentTurn()

    expect(state).toMatchObject({
      status: 'playing',
      heat: 100,
      heatLimitPending: true,
      currentPlayerId: guestSession.playerId,
    })
    expect(state.heatContributionByPlayer.reduce((total, value) => total + value, 0)).toBe(100)

    await completePunishmentTurn()
    expect(state).toMatchObject({
      status: 'playing',
      heat: 100,
      heatLimitPending: true,
      phase: 'awaiting_tiebreak',
    })
  })

  it('服务器拒绝无关玩家跳过他人的私密预测', async () => {
    server = await createRoomServer({ port: 0, eventDeck: quietEventDeck })
    const host = await TestClient.connect(server.wsUrl)
    const reactor = await TestClient.connect(server.wsUrl)
    const unrelated = await TestClient.connect(server.wsUrl)
    clients.push(host, reactor, unrelated)

    host.send({
      type: 'create_room',
      requestId: 'auth-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected host session')

    reactor.send({
      type: 'join_room',
      requestId: 'auth-join-reactor',
      roomCode: hostSession.roomCode,
      nickname: '反应者',
      color: '#4ecdc4',
    })
    await reactor.next(message => message.type === 'session')
    unrelated.send({
      type: 'join_room',
      requestId: 'auth-join-unrelated',
      roomCode: hostSession.roomCode,
      nickname: '无关玩家',
      color: '#45b7d1',
    })
    const unrelatedSession = await unrelated.next(message => message.type === 'session')
    if (unrelatedSession.type !== 'session') throw new Error('expected unrelated session')

    for (const [index, client] of [host, reactor, unrelated].entries()) {
      client.send({ type: 'confirm_settings', requestId: `auth-confirm-${index}` })
    }
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )
    host.send({ type: 'start_game', requestId: 'auth-start' })
    await unrelated.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )

    unrelated.send({ type: 'skip_action', requestId: 'auth-illegal-skip' })
    await expect(
      unrelated.next(
        message => message.type === 'error' && message.requestId === 'auth-illegal-skip'
      )
    ).resolves.toMatchObject({
      type: 'error',
      code: 'NOT_AUTHORIZED',
    })

    reactor.send({
      type: 'submit_prediction',
      requestId: 'auth-valid-prediction',
      prediction: 'high',
    })
    await expect(
      host.next(
        message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
      )
    ).resolves.toMatchObject({ type: 'room_state' })

    unrelated.send({ type: 'skip_action', requestId: 'auth-core-skip-request' })
    await expect(
      host.next(
        message =>
          message.type === 'room_state' &&
          message.room.skipRequestedPlayerIds.includes(unrelatedSession.playerId)
      )
    ).resolves.toMatchObject({
      type: 'room_state',
      room: { game: { phase: 'awaiting_roll' } },
    })
  })

  it('终局后只向各自席位签发私有、可验证的论坛认领凭证', async () => {
    const claimSecret = 'room-server-integration-secret-with-at-least-32-bytes'
    const metricsToken = 'claim-test-metrics-token-at-least-32-bytes'
    const diceValues = [6, 6, 6, 6, 6, 6, 6, 6, 1]
    server = await createRoomServer({
      port: 0,
      rollDice: () => diceValues.shift() ?? 1,
      eventDeck: quietEventDeck,
      achievementClaims: {
        secret: claimSecret,
        claimUrl: 'https://forum.example/where-is-my-friends/flying-chess/claim',
      },
      metricsToken,
    })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)

    host.send({
      type: 'create_room',
      requestId: 'claim-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const hostSession = await host.next(message => message.type === 'session')
    if (hostSession.type !== 'session') throw new Error('expected host session')
    host.send({
      type: 'update_settings',
      requestId: 'claim-settings',
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

    guest.send({
      type: 'join_room',
      requestId: 'claim-join',
      roomCode: hostSession.roomCode,
      nickname: '玩家二',
      color: '#4ecdc4',
    })
    const guestSession = await guest.next(message => message.type === 'session')
    if (guestSession.type !== 'session') throw new Error('expected guest session')
    host.send({ type: 'confirm_settings', requestId: 'claim-confirm-host' })
    guest.send({ type: 'confirm_settings', requestId: 'claim-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'claim-start' })
    const started = await host.next(
      message => message.type === 'room_state' && message.room.game?.status === 'playing'
    )
    if (started.type !== 'room_state') throw new Error('expected room state')
    expect(started.room.achievementClaimUrl).toBeUndefined()

    const takeTurn = async (
      actor: TestClient,
      reactor: TestClient,
      actorId: string,
      suffix: string,
      readyPhase: 'awaiting_prediction' | 'awaiting_roll'
    ): Promise<void> => {
      if (readyPhase === 'awaiting_prediction') {
        reactor.send({
          type: 'submit_prediction',
          requestId: `claim-predict-${suffix}`,
          prediction: 'high',
        })
        await actor.next(
          message =>
            message.type === 'room_state' &&
            message.room.game?.phase === 'awaiting_roll' &&
            message.room.game.currentPlayerId === actorId
        )
      }
      actor.send({ type: 'roll_dice', requestId: `claim-roll-${suffix}` })
      const rolled = await actor.next(
        message =>
          message.type === 'room_state' &&
          (message.room.game?.phase === 'awaiting_reaction' ||
            message.room.game?.phase === 'awaiting_move') &&
          message.room.game.currentPlayerId === actorId
      )
      if (rolled.type !== 'room_state') throw new Error('expected rolled room state')
      if (rolled.room.game?.phase === 'awaiting_reaction') {
        reactor.send({
          type: 'decide_reaction',
          requestId: `claim-reaction-${suffix}`,
          decision: 'keep',
        })
        await actor.next(
          message =>
            message.type === 'room_state' &&
            message.room.game?.phase === 'awaiting_move' &&
            message.room.game.currentPlayerId === actorId
        )
      }
      actor.send({ type: 'move', requestId: `claim-move-${suffix}` })
    }

    const waitUntilTurn = async (
      client: TestClient,
      playerId: string
    ): Promise<'awaiting_prediction' | 'awaiting_roll'> => {
      const ready = await client.next(
        message =>
          message.type === 'room_state' &&
          (message.room.game?.phase === 'awaiting_prediction' ||
            message.room.game?.phase === 'awaiting_roll') &&
          message.room.game.currentPlayerId === playerId
      )
      if (ready.type !== 'room_state' || !ready.room.game) {
        throw new Error('expected turn-ready room state')
      }
      return ready.room.game.phase as 'awaiting_prediction' | 'awaiting_roll'
    }

    let hostReadyPhase = started.room.game?.phase as 'awaiting_prediction' | 'awaiting_roll'
    for (let round = 0; round < 4; round += 1) {
      await takeTurn(host, guest, hostSession.playerId, `host-${round}`, hostReadyPhase)
      const guestReadyPhase = await waitUntilTurn(guest, guestSession.playerId)
      await takeTurn(guest, host, guestSession.playerId, `guest-${round}`, guestReadyPhase)
      hostReadyPhase = await waitUntilTurn(host, hostSession.playerId)
    }
    await takeTurn(host, guest, hostSession.playerId, 'host-final', hostReadyPhase)

    const [hostFinished, guestFinished] = await Promise.all([
      host.next(
        message =>
          message.type === 'room_state' &&
          message.room.status === 'finished' &&
          Boolean(message.room.achievementClaimUrl)
      ),
      guest.next(
        message =>
          message.type === 'room_state' &&
          message.room.status === 'finished' &&
          Boolean(message.room.achievementClaimUrl)
      ),
    ])
    if (hostFinished.type !== 'room_state' || guestFinished.type !== 'room_state') {
      throw new Error('expected finished room states')
    }
    const hostUrl = new URL(hostFinished.room.achievementClaimUrl ?? '')
    const guestUrl = new URL(guestFinished.room.achievementClaimUrl ?? '')
    const hostFragment = new URLSearchParams(hostUrl.hash.replace(/^#/, ''))
    const guestFragment = new URLSearchParams(guestUrl.hash.replace(/^#/, ''))
    const hostClaim = verifyGameCompletionClaim(hostFragment.get('token') ?? '', claimSecret)
    const guestClaim = verifyGameCompletionClaim(guestFragment.get('token') ?? '', claimSecret)

    expect(hostUrl.origin).toBe('https://forum.example')
    expect(hostUrl.search).toBe('')
    expect(hostClaim).toMatchObject({
      event: 'game_completed',
      player_id: hostSession.playerId,
      winner: true,
      place: 1,
    })
    expect(guestClaim).toMatchObject({
      event: 'game_completed',
      player_id: guestSession.playerId,
      winner: false,
    })
    expect(guestClaim.game_id).toBe(hostClaim.game_id)
    expect(hostClaim.ruleset_version).toBe('party_v3')
    expect(guestClaim.ruleset_version).toBe('party_v3')
    expect(guestClaim.jti).not.toBe(hostClaim.jti)
    expect(guestUrl.toString()).not.toBe(hostUrl.toString())
    const metricsResponse = await fetch(
      `${server.wsUrl.replace('ws://', 'http://')}/internal/metrics`,
      { headers: { authorization: `Bearer ${metricsToken}` } }
    )
    await expect(metricsResponse.json()).resolves.toMatchObject({
      counters: { gamesStartedTotal: 1, gamesFinishedTotal: 1 },
    })
  })

  it('设置变更会清空全员确认，未重新全员确认时服务器拒绝开局', async () => {
    server = await createRoomServer({ port: 0 })
    const host = await TestClient.connect(server.wsUrl)
    const playerTwo = await TestClient.connect(server.wsUrl)
    const playerThree = await TestClient.connect(server.wsUrl)
    clients.push(host, playerTwo, playerThree)

    host.send({
      type: 'create_room',
      requestId: 'create-settings',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    const join = async (client: TestClient, suffix: string, color: string) => {
      client.send({
        type: 'join_room',
        requestId: `join-${suffix}`,
        roomCode: created.roomCode,
        nickname: `玩家${suffix}`,
        color,
      })
      return client.next(message => message.type === 'session')
    }
    await join(playerTwo, '二', '#4ecdc4')
    await join(playerThree, '三', '#45b7d1')

    const untrustedSettings = {
      ...DEFAULT_ONLINE_ROOM_SETTINGS,
      scenePreset: 'icebreaker',
      punishmentConfig: { tools: { privateTool: 'do-not-broadcast' } },
      privateConfig: 'do-not-broadcast',
    } as unknown as OnlineRoomSettings
    host.send({
      type: 'update_settings',
      requestId: 'settings-1',
      settings: untrustedSettings,
    })
    const sanitized = await host.next(
      message => message.type === 'room_state' && message.room.settings.scenePreset === 'icebreaker'
    )
    if (sanitized.type !== 'room_state') throw new Error('expected room state')
    expect(sanitized.room.settings).toHaveProperty('punishmentConfig')
    const guestSanitized = await playerTwo.next(
      message => message.type === 'room_state' && message.room.settings.scenePreset === 'icebreaker'
    )
    if (guestSanitized.type !== 'room_state') throw new Error('expected room state')
    expect(guestSanitized.room.settings).not.toHaveProperty('punishmentConfig')
    expect(guestSanitized.room.settings).not.toHaveProperty('privateConfig')

    for (const [index, client] of [host, playerTwo, playerThree].entries()) {
      client.send({ type: 'confirm_settings', requestId: `confirm-${index}` })
    }
    const allConfirmed = await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )
    expect(allConfirmed).toMatchObject({
      type: 'room_state',
      room: { confirmedPlayerIds: expect.arrayContaining([created.playerId]) },
    })

    host.send({
      type: 'update_settings',
      requestId: 'settings-2',
      settings: { ...DEFAULT_ONLINE_ROOM_SETTINGS, scenePreset: 'hardcore' },
    })
    const confirmationsCleared = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.settings.scenePreset === 'hardcore' &&
        message.room.confirmedPlayerIds.length === 0
    )
    expect(confirmationsCleared).toMatchObject({ type: 'room_state' })

    host.send({ type: 'start_game', requestId: 'start-blocked' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'start-blocked' &&
          message.code === 'NOT_ALL_CONFIRMED'
      )
    ).resolves.toMatchObject({ message: '所有玩家确认设置后才能开始' })

    for (const [index, client] of [host, playerTwo, playerThree].entries()) {
      client.send({ type: 'confirm_settings', requestId: `reconfirm-${index}` })
    }
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )
    host.send({ type: 'start_game', requestId: 'start-confirmed' })
    await expect(
      host.next(message => message.type === 'room_state' && message.room.status === 'playing')
    ).resolves.toMatchObject({ type: 'room_state' })
  })

  it('服务器拒绝超出单机标准模式约束的棋盘设置', async () => {
    server = await createRoomServer({ port: 0 })
    const host = await TestClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'invalid-settings-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    await host.next(message => message.type === 'session')

    host.send({
      type: 'update_settings',
      requestId: 'invalid-board-settings',
      settings: {
        ...DEFAULT_ONLINE_ROOM_SETTINGS,
        boardConfig: {
          ...DEFAULT_ONLINE_ROOM_SETTINGS.boardConfig,
          totalCells: 20,
        },
      },
    })

    await expect(
      host.next(
        message => message.type === 'error' && message.requestId === 'invalid-board-settings'
      )
    ).resolves.toMatchObject({ code: 'INVALID_SETTINGS', message: '房间设置无效' })
  })

  it('普通玩家只能请求暂停，只有主持人可以暂停和恢复整局', async () => {
    server = await createRoomServer({ port: 0 })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)

    host.send({
      type: 'create_room',
      requestId: 'pause-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    guest.send({
      type: 'join_room',
      requestId: 'pause-join',
      roomCode: created.roomCode,
      nickname: '普通玩家',
      color: '#4ecdc4',
    })
    const joined = await guest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')

    host.send({ type: 'confirm_settings', requestId: 'pause-confirm-host' })
    guest.send({ type: 'confirm_settings', requestId: 'pause-confirm-guest' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'pause-start' })
    await host.next(message => message.type === 'room_state' && message.room.status === 'playing')

    guest.send({ type: 'pause_game', requestId: 'pause-request' })
    const requested = await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.pauseRequestedPlayerIds.includes(joined.playerId)
    )
    expect(requested).toMatchObject({
      type: 'room_state',
      room: { game: { paused: false }, pauseRequestedPlayerIds: [joined.playerId] },
    })

    host.send({ type: 'pause_game', requestId: 'pause-approve' })
    await expect(
      guest.next(
        message =>
          message.type === 'room_state' &&
          message.room.game?.paused === true &&
          message.room.pauseRequestedPlayerIds.length === 0
      )
    ).resolves.toMatchObject({ type: 'room_state' })

    guest.send({ type: 'resume_game', requestId: 'pause-resume-guest' })
    await expect(
      guest.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'pause-resume-guest' &&
          message.code === 'HOST_ONLY'
      )
    ).resolves.toMatchObject({ type: 'error' })

    host.send({ type: 'resume_game', requestId: 'pause-resume-host' })
    await expect(
      guest.next(message => message.type === 'room_state' && message.room.game?.paused === false)
    ).resolves.toMatchObject({ type: 'room_state' })
  })

  it('主持人可以把管理角色转交给另一名玩家，权限立即随角色移动', async () => {
    const metricsToken = 'transfer-test-metrics-token-at-least-32-bytes'
    server = await createRoomServer({ port: 0, metricsToken })
    const host = await TestClient.connect(server.wsUrl)
    const successor = await TestClient.connect(server.wsUrl)
    clients.push(host, successor)

    host.send({
      type: 'create_room',
      requestId: 'create-transfer',
      nickname: '原主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    successor.send({
      type: 'join_room',
      requestId: 'join-successor',
      roomCode: created.roomCode,
      nickname: '新主持人',
      color: '#4ecdc4',
    })
    const joined = await successor.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')

    host.send({
      type: 'transfer_host',
      requestId: 'transfer-1',
      playerId: joined.playerId,
    })
    await expect(
      successor.next(
        message => message.type === 'room_state' && message.room.hostPlayerId === joined.playerId
      )
    ).resolves.toMatchObject({ type: 'room_state' })

    host.send({
      type: 'update_settings',
      requestId: 'old-host-settings',
      settings: { ...DEFAULT_ONLINE_ROOM_SETTINGS, scenePreset: 'icebreaker' },
    })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'old-host-settings' &&
          message.code === 'HOST_ONLY'
      )
    ).resolves.toMatchObject({ type: 'error' })

    successor.send({
      type: 'update_settings',
      requestId: 'new-host-settings',
      settings: { ...DEFAULT_ONLINE_ROOM_SETTINGS, scenePreset: 'icebreaker' },
    })
    await expect(
      host.next(
        message =>
          message.type === 'room_state' && message.room.settings.scenePreset === 'icebreaker'
      )
    ).resolves.toMatchObject({ type: 'room_state' })
    const metricsResponse = await fetch(
      `${server.wsUrl.replace('ws://', 'http://')}/internal/metrics`,
      { headers: { authorization: `Bearer ${metricsToken}` } }
    )
    await expect(metricsResponse.json()).resolves.toMatchObject({
      counters: { hostTransfersTotal: 1 },
    })
  })

  it('不允许把主持权转交给离线玩家', async () => {
    server = await createRoomServer({ port: 0 })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)
    host.send({
      type: 'create_room',
      requestId: 'offline-transfer-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    guest.send({
      type: 'join_room',
      requestId: 'offline-transfer-join',
      roomCode: created.roomCode,
      nickname: '离线玩家',
      color: '#4ecdc4',
    })
    const joined = await guest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')
    await guest.disconnect()
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.players.some(player => player.id === joined.playerId && !player.connected)
    )

    host.send({
      type: 'transfer_host',
      requestId: 'offline-transfer',
      playerId: joined.playerId,
    })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'offline-transfer' &&
          message.code === 'PLAYER_DISCONNECTED'
      )
    ).resolves.toMatchObject({ type: 'error' })
  })

  it('已确认玩家断线后不能开局，规则错误保留原请求标识', async () => {
    server = await createRoomServer({ port: 0 })
    const host = await TestClient.connect(server.wsUrl)
    const guest = await TestClient.connect(server.wsUrl)
    clients.push(host, guest)
    host.send({
      type: 'create_room',
      requestId: 'connected-start-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    guest.send({
      type: 'join_room',
      requestId: 'connected-start-join',
      roomCode: created.roomCode,
      nickname: '玩家二',
      color: '#4ecdc4',
    })
    const joined = await guest.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')
    host.send({ type: 'confirm_settings', requestId: 'connected-start-host-confirm' })
    guest.send({ type: 'confirm_settings', requestId: 'connected-start-guest-confirm' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    await guest.disconnect()
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.players.some(player => player.id === joined.playerId && !player.connected)
    )

    host.send({ type: 'start_game', requestId: 'connected-start-blocked' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'connected-start-blocked' &&
          message.code === 'PLAYERS_DISCONNECTED'
      )
    ).resolves.toMatchObject({ type: 'error' })

    const resumed = await TestClient.connect(server.wsUrl)
    clients.push(resumed)
    resumed.send({
      type: 'resume_room',
      requestId: 'connected-start-resume',
      roomCode: joined.roomCode,
      playerId: joined.playerId,
      resumeToken: joined.resumeToken,
    })
    await resumed.next(message => message.type === 'session')
    host.send({ type: 'start_game', requestId: 'connected-start-ok' })
    await host.next(message => message.type === 'room_state' && message.room.status === 'playing')

    host.send({ type: 'roll_dice', requestId: 'rule-error-request-id' })
    await expect(
      host.next(
        message =>
          message.type === 'error' &&
          message.requestId === 'rule-error-request-id' &&
          message.code === 'INVALID_PHASE'
      )
    ).resolves.toMatchObject({ type: 'error' })
  })

  it('单连接消息洪泛会被限速并断开', async () => {
    const metricsToken = 'rate-test-metrics-token-at-least-32-bytes'
    server = await createRoomServer({
      port: 0,
      messagesPerSecond: 1,
      messageBurst: 2,
      metricsToken,
    })
    const client = await TestClient.connect(server.wsUrl)
    clients.push(client)
    client.send({
      type: 'create_room',
      requestId: 'rate-create',
      nickname: '限速玩家',
      color: '#ff6b6b',
    })
    await client.next(message => message.type === 'session')
    client.send({ type: 'confirm_settings', requestId: 'rate-confirm-1' })
    client.send({ type: 'confirm_settings', requestId: 'rate-confirm-2' })

    await expect(
      client.next(message => message.type === 'error' && message.code === 'RATE_LIMITED')
    ).resolves.toMatchObject({ type: 'error' })
    const metricsResponse = await fetch(
      `${server.wsUrl.replace('ws://', 'http://')}/internal/metrics`,
      { headers: { authorization: `Bearer ${metricsToken}` } }
    )
    await expect(metricsResponse.json()).resolves.toMatchObject({
      counters: { rateLimitedMessagesTotal: 1 },
    })
  })

  it('八名玩家可在 60 秒门槛内加入并全员确认，第九名被容量门禁拒绝', async () => {
    server = await createRoomServer({ port: 0 })
    const serverUrl = server.wsUrl
    const palette = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#feca57',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
      '#111111',
    ]
    const roomClients = await Promise.all(
      palette.map(async () => {
        const client = await TestClient.connect(serverUrl)
        clients.push(client)
        return client
      })
    )
    const [host, ...guests] = roomClients
    if (!host) throw new Error('expected host client')
    const startedAt = performance.now()
    host.send({
      type: 'create_room',
      requestId: 'capacity-create',
      nickname: '玩家1',
      color: palette[0],
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')

    for (let index = 0; index < 7; index += 1) {
      const guest = guests[index]
      if (!guest) throw new Error('expected guest client')
      guest.send({
        type: 'join_room',
        requestId: `capacity-join-${index}`,
        roomCode: created.roomCode,
        nickname: `玩家${index + 2}`,
        color: palette[index + 1],
      })
      await guest.next(message => message.type === 'session')
    }
    await expect(
      host.next(message => message.type === 'room_state' && message.room.players.length === 8)
    ).resolves.toMatchObject({ type: 'room_state' })

    for (const [index, client] of roomClients.slice(0, 8).entries()) {
      client.send({ type: 'confirm_settings', requestId: `capacity-confirm-${index}` })
    }
    await expect(
      host.next(
        message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 8
      )
    ).resolves.toMatchObject({ type: 'room_state' })
    expect(performance.now() - startedAt).toBeLessThan(60_000)

    const ninth = guests[7]
    if (!ninth) throw new Error('expected ninth client')
    ninth.send({
      type: 'join_room',
      requestId: 'capacity-join-9',
      roomCode: created.roomCode,
      nickname: '玩家9',
      color: palette[8],
    })
    await expect(
      ninth.next(message => message.type === 'error' && message.requestId === 'capacity-join-9')
    ).resolves.toMatchObject({ type: 'error', code: 'ROOM_FULL' })
  })

  it('房间寿命从创建时硬性计算，活跃消息不能把两小时上限续期', async () => {
    let now = 1_000
    const metricsToken = 'expiry-test-metrics-token-at-least-32-bytes'
    server = await createRoomServer({
      port: 0,
      now: () => now,
      roomTtlMs: 40,
      metricsToken,
    })
    const host = await TestClient.connect(server.wsUrl)
    clients.push(host)
    host.send({
      type: 'create_room',
      requestId: 'ttl-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    await host.next(message => message.type === 'session')

    now += 30
    host.send({ type: 'confirm_settings', requestId: 'ttl-activity' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 1
    )
    now += 11

    await expect(
      host.next(message => message.type === 'error' && message.code === 'ROOM_EXPIRED')
    ).resolves.toMatchObject({ type: 'error', code: 'ROOM_EXPIRED' })
    const metricsResponse = await fetch(
      `${server.wsUrl.replace('ws://', 'http://')}/internal/metrics`,
      { headers: { authorization: `Bearer ${metricsToken}` } }
    )
    await expect(metricsResponse.json()).resolves.toMatchObject({
      counters: { roomsExpiredTotal: 1 },
      gauges: { rooms: 0, drainBlockingRooms: 0 },
    })
  })

  it('主持人断线超过保护期后自动把管理角色交给在线玩家', async () => {
    let now = 1_000
    server = await createRoomServer({ port: 0, now: () => now, reconnectGraceMs: 90_000 })
    const host = await TestClient.connect(server.wsUrl)
    const successor = await TestClient.connect(server.wsUrl)
    clients.push(host, successor)
    host.send({
      type: 'create_room',
      requestId: 'failover-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    successor.send({
      type: 'join_room',
      requestId: 'failover-join',
      roomCode: created.roomCode,
      nickname: '接任玩家',
      color: '#4ecdc4',
    })
    const joined = await successor.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')

    host.send({ type: 'confirm_settings', requestId: 'failover-confirm-host' })
    successor.send({ type: 'confirm_settings', requestId: 'failover-confirm-successor' })
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 2
    )
    host.send({ type: 'start_game', requestId: 'failover-start' })
    await host.next(message => message.type === 'room_state' && message.room.status === 'playing')

    successor.send({ type: 'pause_game', requestId: 'failover-pause-request' })
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.pauseRequestedPlayerIds.includes(joined.playerId)
    )

    await host.disconnect()
    now += 90_000

    const transferred = await successor.next(
      message => message.type === 'room_state' && message.room.hostPlayerId === joined.playerId
    )
    expect(transferred).toMatchObject({
      type: 'room_state',
      room: {
        pauseRequestedPlayerIds: [],
        players: expect.arrayContaining([
          expect.objectContaining({
            id: created.playerId,
            connected: false,
            removable: false,
            removalBlockReason: 'minimum_players',
          }),
        ]),
      },
    })
  })

  it('断线后凭一次性恢复凭证回到原席位，并在 90 秒保护期后允许主持人移除', async () => {
    let now = 1_000
    server = await createRoomServer({ port: 0, now: () => now, reconnectGraceMs: 90_000 })
    const host = await TestClient.connect(server.wsUrl)
    const player = await TestClient.connect(server.wsUrl)
    clients.push(host, player)
    host.send({
      type: 'create_room',
      requestId: 'resume-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    player.send({
      type: 'join_room',
      requestId: 'resume-join',
      roomCode: created.roomCode,
      nickname: '可恢复玩家',
      color: '#4ecdc4',
    })
    const joined = await player.next(message => message.type === 'session')
    if (joined.type !== 'session') throw new Error('expected session')

    await player.disconnect()
    await expect(
      host.next(
        message =>
          message.type === 'room_state' &&
          message.room.players.some(
            candidate => candidate.id === joined.playerId && !candidate.connected
          )
      )
    ).resolves.toMatchObject({ type: 'room_state' })

    const resumedClient = await TestClient.connect(server.wsUrl)
    clients.push(resumedClient)
    resumedClient.send({
      type: 'resume_room',
      requestId: 'resume-valid',
      roomCode: joined.roomCode,
      playerId: joined.playerId,
      resumeToken: joined.resumeToken,
    })
    const resumed = await resumedClient.next(message => message.type === 'session')
    expect(resumed).toMatchObject({
      type: 'session',
      requestId: 'resume-valid',
      playerId: joined.playerId,
    })
    if (resumed.type !== 'session') throw new Error('expected session')
    expect(resumed.resumeToken).not.toBe(joined.resumeToken)

    now += 1_000
    await resumedClient.disconnect()
    await host.next(
      message =>
        message.type === 'room_state' &&
        message.room.players.some(
          candidate => candidate.id === joined.playerId && !candidate.connected
        )
    )
    now += 90_000
    host.send({ type: 'remove_player', requestId: 'remove-offline', playerId: joined.playerId })
    await expect(
      host.next(
        message =>
          message.type === 'room_state' &&
          !message.room.players.some(candidate => candidate.id === joined.playerId)
      )
    ).resolves.toMatchObject({ type: 'room_state' })
  })

  it('服务器在预测截止时采用安全默认值，而不是等待客户端自报超时', async () => {
    let now = 5_000
    server = await createRoomServer({ port: 0, now: () => now })
    const host = await TestClient.connect(server.wsUrl)
    const playerTwo = await TestClient.connect(server.wsUrl)
    const playerThree = await TestClient.connect(server.wsUrl)
    clients.push(host, playerTwo, playerThree)
    host.send({
      type: 'create_room',
      requestId: 'timeout-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    for (const [index, client] of [playerTwo, playerThree].entries()) {
      client.send({
        type: 'join_room',
        requestId: `timeout-join-${index}`,
        roomCode: created.roomCode,
        nickname: `玩家${index + 2}`,
        color: index === 0 ? '#4ecdc4' : '#45b7d1',
      })
      await client.next(message => message.type === 'session')
    }
    for (const [index, client] of [host, playerTwo, playerThree].entries()) {
      client.send({ type: 'confirm_settings', requestId: `timeout-confirm-${index}` })
    }
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )
    host.send({ type: 'start_game', requestId: 'timeout-start' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )
    now += 60_000
    const defaulted = await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    if (defaulted.type !== 'room_state') throw new Error('expected room state')
    expect(defaulted.room.game?.reaction?.prediction).toBeUndefined()
    const privateDefault = await playerTwo.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    if (privateDefault.type !== 'room_state') throw new Error('expected room state')
    expect(privateDefault.room.game?.reaction?.prediction).toBe('low')
  })

  it('逐玩家序列化不会把秘密出拳发送给本人以外的客户端', async () => {
    server = await createRoomServer({
      port: 0,
      rollDice: () => 6,
      eventDeck: [
        {
          id: 'private-rps',
          title: '全员猜拳',
          description: '秘密出拳后统一揭晓',
          tags: ['猜拳'],
          trigger: { kind: 'every_n_turns', interval: 1 },
          effect: { kind: 'rock_paper_scissors' },
        },
      ],
    })
    const host = await TestClient.connect(server.wsUrl)
    const playerTwo = await TestClient.connect(server.wsUrl)
    const playerThree = await TestClient.connect(server.wsUrl)
    clients.push(host, playerTwo, playerThree)
    host.send({
      type: 'create_room',
      requestId: 'private-create',
      nickname: '主持人',
      color: '#ff6b6b',
    })
    const created = await host.next(message => message.type === 'session')
    if (created.type !== 'session') throw new Error('expected session')
    for (const [index, client] of [playerTwo, playerThree].entries()) {
      client.send({
        type: 'join_room',
        requestId: `private-join-${index}`,
        roomCode: created.roomCode,
        nickname: `玩家${index + 2}`,
        color: index === 0 ? '#4ecdc4' : '#45b7d1',
      })
      await client.next(message => message.type === 'session')
    }
    for (const [index, client] of [host, playerTwo, playerThree].entries()) {
      client.send({ type: 'confirm_settings', requestId: `private-confirm-${index}` })
    }
    await host.next(
      message => message.type === 'room_state' && message.room.confirmedPlayerIds.length === 3
    )
    host.send({ type: 'start_game', requestId: 'private-start' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_prediction'
    )
    playerTwo.send({ type: 'submit_prediction', requestId: 'private-predict', prediction: 'high' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_roll'
    )
    host.send({ type: 'roll_dice', requestId: 'private-roll' })
    await playerTwo.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_reaction'
    )
    playerTwo.send({ type: 'decide_reaction', requestId: 'private-react', decision: 'keep' })
    await host.next(
      message => message.type === 'room_state' && message.room.game?.phase === 'awaiting_move'
    )
    host.send({ type: 'move', requestId: 'private-move' })
    await playerTwo.next(
      message =>
        message.type === 'room_state' && message.room.game?.pendingAction?.kind === 'event_rps'
    )
    playerTwo.send({ type: 'rps', requestId: 'private-choice', choice: 'scissors' })
    const unrelatedViews = await Promise.all(
      [host, playerThree].map(client =>
        client.next(
          message =>
            message.type === 'room_state' &&
            message.room.game?.pendingAction?.kind === 'event_rps' &&
            message.room.game.pendingAction.submittedCount === 1
        )
      )
    )
    for (const view of unrelatedViews) {
      expect(JSON.stringify(view)).not.toContain('scissors')
      expect(JSON.stringify(view)).not.toContain('choices')
    }
  })
})
