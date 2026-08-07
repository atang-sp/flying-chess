import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import { createServer, type Server as HttpServer } from 'node:http'
import {
  applyOnlineGameCommand,
  applyOnlineGameTimeout,
  cloneOnlineRoomSettings,
  createOnlineGame,
  DEFAULT_ONLINE_ROOM_SETTINGS,
  GameCommandError,
  ONLINE_PLAYER_COLORS,
  isOnlinePlayerRemovalSafe,
  normalizeOnlineRoomSettings,
  projectOnlineRoomSettings,
  projectOnlineGameView,
  removeOnlinePlayerAtSafeNode,
  type GameCommandDependencies,
  type OnlineGameCommand,
  type OnlineGameState,
  type OnlineRoomSettings,
  type PartyEventCard,
} from '@flying-chess/game-core'
import { WebSocket, WebSocketServer } from 'ws'
import type { ClientMessage, RoomPlayerView, RoomView, ServerMessage } from './protocol'
import {
  buildGameCompletionClaimUrl,
  createGameCompletionClaim,
  validateGameCompletionClaimConfiguration,
  type GameCompletionClaimOptions,
} from './gameCompletionClaims'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_ROOM_TTL_MS = 2 * 60 * 60 * 1_000
const DEFAULT_MAX_ROOMS = 20
const DEFAULT_MAX_CONNECTIONS = 200
const MAX_PLAYERS_PER_ROOM = 8
const DEFAULT_RECONNECT_GRACE_MS = 90_000
const MAX_MESSAGE_BYTES = 16 * 1_024
const NICKNAME_MAX_LENGTH = 20
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const DEFAULT_MESSAGES_PER_SECOND = 30
const DEFAULT_MESSAGE_BURST = 60

interface RoomPlayer {
  readonly id: string
  resumeToken: string
  readonly nickname: string
  readonly color: string
  socket: WebSocket | null
  disconnectedAt: number | null
}

interface Room {
  readonly code: string
  readonly createdAt: number
  hostPlayerId: string
  readonly players: RoomPlayer[]
  settings: OnlineRoomSettings
  readonly confirmedPlayerIds: Set<string>
  readonly skipRequestedPlayerIds: Set<string>
  readonly pauseRequestedPlayerIds: Set<string>
  game: OnlineGameState | null
  gameId: string | null
  gameCompletedAt: number | null
  readonly achievementClaimUrls: Map<string, string>
}

interface ConnectionSession {
  readonly room: Room
  readonly player: RoomPlayer
}

export interface RoomServerOptions {
  readonly port?: number
  readonly host?: string
  readonly maxRooms?: number
  readonly roomTtlMs?: number
  readonly rollDice?: () => number
  readonly now?: () => number
  readonly eventDeck?: readonly PartyEventCard[]
  readonly reconnectGraceMs?: number
  readonly maxConnections?: number
  readonly allowedOrigins?: readonly string[]
  readonly messagesPerSecond?: number
  readonly messageBurst?: number
  readonly achievementClaims?: GameCompletionClaimOptions & Readonly<{ claimUrl: string }>
}

export interface RunningRoomServer {
  readonly port: number
  readonly wsUrl: string
  close(): Promise<void>
}

class ProtocolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId?: string
  ) {
    super(message)
  }
}

export async function createRoomServer(
  options: RoomServerOptions = {}
): Promise<RunningRoomServer> {
  if (options.achievementClaims) {
    validateGameCompletionClaimConfiguration(options.achievementClaims)
  }
  const now = options.now ?? Date.now
  const maxRooms = options.maxRooms ?? DEFAULT_MAX_ROOMS
  const roomTtlMs = options.roomTtlMs ?? DEFAULT_ROOM_TTL_MS
  const reconnectGraceMs = options.reconnectGraceMs ?? DEFAULT_RECONNECT_GRACE_MS
  const maxConnections = options.maxConnections ?? DEFAULT_MAX_CONNECTIONS
  const messagesPerSecond = Math.max(1, options.messagesPerSecond ?? DEFAULT_MESSAGES_PER_SECOND)
  const messageBurst = Math.max(1, options.messageBurst ?? DEFAULT_MESSAGE_BURST)
  const startedAt = Date.now()
  const gameDependencies: GameCommandDependencies = {
    rollDice: options.rollDice ?? (() => randomInt(1, 7)),
    randomInt: (minimum, maximum) => randomInt(minimum, maximum + 1),
    now,
  }
  const rooms = new Map<string, Room>()
  const sessions = new Map<WebSocket, ConnectionSession>()
  let connectionCount = 0
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && (request.url === '/health' || request.url === '/ready')) {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end(
        JSON.stringify({
          status: 'ok',
          rooms: rooms.size,
          connections: connectionCount,
          uptimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
          rssBytes: process.memoryUsage().rss,
        })
      )
      return
    }
    response.writeHead(404).end()
  })
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    maxPayload: MAX_MESSAGE_BYTES,
    verifyClient: ({ origin }: { origin: string }) =>
      webSocketServer?.clients.size < maxConnections &&
      (!options.allowedOrigins?.length || options.allowedOrigins.includes(origin)),
  })

  const cleanupTimer = setInterval(
    () => {
      const timestamp = now()
      for (const [code, room] of rooms) {
        if (timestamp - room.createdAt < roomTtlMs) continue
        for (const player of room.players) {
          send(player.socket, { type: 'error', code: 'ROOM_EXPIRED', message: '房间已过期' })
          player.socket?.close(1001, 'room expired')
        }
        rooms.delete(code)
      }
    },
    Math.min(roomTtlMs, 60_000)
  )
  cleanupTimer.unref()

  const gameTimer = setInterval(() => {
    const timestamp = now()
    for (const room of rooms.values()) {
      let changed = transferExpiredHost(room, timestamp)
      if (room.game) {
        const next = applyOnlineGameTimeout(room.game, timestamp, gameDependencies)
        if (next !== room.game) {
          updateRoomGame(room, next)
          changed = true
        }
      }
      if (changed) broadcastRoom(room)
    }
  }, 100)
  gameTimer.unref()

  const lastPongAt = new WeakMap<WebSocket, number>()
  const heartbeatTimer = setInterval(() => {
    const timestamp = Date.now()
    for (const socket of webSocketServer.clients) {
      if (timestamp - (lastPongAt.get(socket) ?? timestamp) > 70_000) {
        socket.terminate()
      } else if (socket.readyState === WebSocket.OPEN) {
        socket.ping()
      }
    }
  }, 30_000)
  heartbeatTimer.unref()

  webSocketServer.on('connection', socket => {
    connectionCount += 1
    let availableMessageTokens = messageBurst
    let lastMessageRefillAt = Date.now()
    lastPongAt.set(socket, Date.now())
    socket.on('pong', () => lastPongAt.set(socket, Date.now()))
    socket.on('message', raw => {
      const receivedAt = Date.now()
      availableMessageTokens = Math.min(
        messageBurst,
        availableMessageTokens + ((receivedAt - lastMessageRefillAt) / 1_000) * messagesPerSecond
      )
      lastMessageRefillAt = receivedAt
      if (availableMessageTokens < 1) {
        send(socket, {
          type: 'error',
          code: 'RATE_LIMITED',
          message: '消息过于频繁，请重新连接',
        })
        socket.close(1008, 'message rate exceeded')
        return
      }
      availableMessageTokens -= 1
      let requestId: string | undefined
      try {
        const message = parseClientMessage(raw.toString())
        requestId = message.requestId
        handleMessage(socket, message)
      } catch (error) {
        const protocolError = normalizeError(error, requestId)
        send(socket, {
          type: 'error',
          requestId: protocolError.requestId,
          code: protocolError.code,
          message: protocolError.message,
        })
      }
    })
    socket.on('close', () => {
      connectionCount = Math.max(0, connectionCount - 1)
      const session = sessions.get(socket)
      sessions.delete(socket)
      if (!session || session.player.socket !== socket) return
      session.player.socket = null
      session.player.disconnectedAt = now()
      session.room.skipRequestedPlayerIds.delete(session.player.id)
      session.room.pauseRequestedPlayerIds.delete(session.player.id)
      if (rooms.get(session.room.code) === session.room) broadcastRoom(session.room)
    })
  })

  function handleMessage(socket: WebSocket, message: ClientMessage): void {
    if (message.type === 'create_room') {
      if (sessions.has(socket))
        throw new ProtocolError('ALREADY_JOINED', '当前连接已经加入房间', message.requestId)
      if (rooms.size >= maxRooms)
        throw new ProtocolError('ROOM_LIMIT_REACHED', '房间数量已达上限', message.requestId)
      const code = createUniqueRoomCode(rooms)
      const player = createPlayer(message.nickname, message.color, socket, message.requestId)
      const room: Room = {
        code,
        createdAt: now(),
        hostPlayerId: player.id,
        players: [player],
        settings: cloneOnlineRoomSettings(DEFAULT_ONLINE_ROOM_SETTINGS),
        confirmedPlayerIds: new Set(),
        skipRequestedPlayerIds: new Set(),
        pauseRequestedPlayerIds: new Set(),
        game: null,
        gameId: null,
        gameCompletedAt: null,
        achievementClaimUrls: new Map(),
      }
      rooms.set(code, room)
      sessions.set(socket, { room, player })
      sendSession(socket, room, player, message.requestId)
      broadcastRoom(room)
      return
    }

    if (message.type === 'join_room') {
      if (sessions.has(socket))
        throw new ProtocolError('ALREADY_JOINED', '当前连接已经加入房间', message.requestId)
      const room = rooms.get(message.roomCode.toUpperCase())
      if (!room) throw new ProtocolError('ROOM_NOT_FOUND', '房间不存在', message.requestId)
      if (room.game)
        throw new ProtocolError('GAME_ALREADY_STARTED', '开局后不能加入或补位', message.requestId)
      if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
        throw new ProtocolError('ROOM_FULL', '房间人数已满', message.requestId)
      }
      let player = createPlayer(message.nickname, message.color, socket, message.requestId)
      if (room.players.some(existing => colorsMatch(existing.color, player.color))) {
        const availableColor = ONLINE_PLAYER_COLORS.find(candidate =>
          room.players.every(existing => !colorsMatch(existing.color, candidate))
        )
        if (!availableColor) {
          throw new ProtocolError('COLOR_TAKEN', '没有可用的玩家颜色', message.requestId)
        }
        player = { ...player, color: availableColor }
      }
      room.players.push(player)
      room.confirmedPlayerIds.clear()
      sessions.set(socket, { room, player })
      sendSession(socket, room, player, message.requestId)
      broadcastRoom(room)
      return
    }

    if (message.type === 'resume_room') {
      if (sessions.has(socket)) {
        throw new ProtocolError('ALREADY_JOINED', '当前连接已经加入房间', message.requestId)
      }
      const room = rooms.get(message.roomCode.toUpperCase())
      if (!room) throw new ProtocolError('ROOM_NOT_FOUND', '房间不存在', message.requestId)
      const player = room.players.find(candidate => candidate.id === message.playerId)
      if (!player || player.resumeToken !== message.resumeToken) {
        throw new ProtocolError('INVALID_RESUME_TOKEN', '恢复凭证无效', message.requestId)
      }
      if (player.socket) {
        sessions.delete(player.socket)
        player.socket.close(4001, 'session resumed elsewhere')
      }
      player.socket = socket
      player.disconnectedAt = null
      player.resumeToken = randomBytes(24).toString('base64url')
      sessions.set(socket, { room, player })
      sendSession(socket, room, player, message.requestId)
      broadcastRoom(room)
      return
    }

    const session = sessions.get(socket)
    if (!session) throw new ProtocolError('NOT_IN_ROOM', '请先创建或加入房间', message.requestId)
    const { room, player } = session

    if (message.type === 'transfer_host') {
      if (room.hostPlayerId !== player.id) {
        throw new ProtocolError('HOST_ONLY', '只有主持人可以转交管理角色', message.requestId)
      }
      if (!room.players.some(candidate => candidate.id === message.playerId)) {
        throw new ProtocolError('PLAYER_NOT_FOUND', '接任玩家不在房间中', message.requestId)
      }
      const successor = room.players.find(candidate => candidate.id === message.playerId)
      if (successor?.socket?.readyState !== WebSocket.OPEN) {
        throw new ProtocolError(
          'PLAYER_DISCONNECTED',
          '只能把主持权转交给在线玩家',
          message.requestId
        )
      }
      room.hostPlayerId = message.playerId
      room.skipRequestedPlayerIds.clear()
      room.pauseRequestedPlayerIds.clear()
      broadcastRoom(room)
      return
    }

    if (message.type === 'remove_player') {
      if (room.hostPlayerId !== player.id) {
        throw new ProtocolError('HOST_ONLY', '只有主持人可以移除长期离线玩家', message.requestId)
      }
      const targetIndex = room.players.findIndex(candidate => candidate.id === message.playerId)
      const target = room.players[targetIndex]
      if (!target)
        throw new ProtocolError('PLAYER_NOT_FOUND', '离场玩家不在房间中', message.requestId)
      if (target.id === room.hostPlayerId) {
        throw new ProtocolError(
          'TRANSFER_HOST_FIRST',
          '主持人需先转交角色再离场',
          message.requestId
        )
      }
      if (target.disconnectedAt === null || now() - target.disconnectedAt < reconnectGraceMs) {
        throw new ProtocolError(
          'RECONNECT_GRACE_ACTIVE',
          '玩家断线满 90 秒后才能移除',
          message.requestId
        )
      }
      if (room.game) {
        if (!isOnlinePlayerRemovalSafe(room.game)) {
          throw new ProtocolError(
            'UNSAFE_REMOVAL_POINT',
            '只能在新回合安全节点移除玩家',
            message.requestId
          )
        }
        room.game = removeOnlinePlayerAtSafeNode(room.game, target.id)
      }
      room.players.splice(targetIndex, 1)
      room.confirmedPlayerIds.delete(target.id)
      room.skipRequestedPlayerIds.delete(target.id)
      room.pauseRequestedPlayerIds.delete(target.id)
      broadcastRoom(room)
      return
    }

    if (message.type === 'skip_action') {
      const phase = room.game?.phase
      const isCoreOperation =
        phase === 'awaiting_roll' ||
        phase === 'awaiting_move' ||
        phase === 'awaiting_tiebreak' ||
        phase === 'awaiting_chain_roll'
      if (isCoreOperation && room.hostPlayerId !== player.id) {
        room.skipRequestedPlayerIds.add(player.id)
        broadcastRoom(room)
        return
      }
    }

    if (message.type === 'update_settings') {
      if (room.hostPlayerId !== player.id) {
        throw new ProtocolError('HOST_ONLY', '只有主持人可以修改设置', message.requestId)
      }
      if (room.game)
        throw new ProtocolError('GAME_ALREADY_STARTED', '开局后不能修改设置', message.requestId)
      room.settings = cloneOnlineRoomSettings(message.settings)
      room.confirmedPlayerIds.clear()
      broadcastRoom(room)
      return
    }

    if (message.type === 'confirm_settings') {
      if (room.game)
        throw new ProtocolError('GAME_ALREADY_STARTED', '游戏已经开始', message.requestId)
      room.confirmedPlayerIds.add(player.id)
      broadcastRoom(room)
      return
    }

    if (message.type === 'start_game') {
      if (room.hostPlayerId !== player.id) {
        throw new ProtocolError('HOST_ONLY', '只有主持人可以开始游戏', message.requestId)
      }
      if (room.game)
        throw new ProtocolError('GAME_ALREADY_STARTED', '游戏已经开始', message.requestId)
      if (!room.players.every(roomPlayer => room.confirmedPlayerIds.has(roomPlayer.id))) {
        throw new ProtocolError(
          'NOT_ALL_CONFIRMED',
          '所有玩家确认设置后才能开始',
          message.requestId
        )
      }
      if (!room.players.every(roomPlayer => roomPlayer.socket?.readyState === WebSocket.OPEN)) {
        throw new ProtocolError('PLAYERS_DISCONNECTED', '所有玩家在线时才能开始', message.requestId)
      }
      room.game = createOnlineGame(
        room.players.map(roomPlayer => ({
          id: roomPlayer.id,
          nickname: roomPlayer.nickname,
          color: roomPlayer.color,
        })),
        room.settings,
        { startedAt: now(), eventDeck: options.eventDeck }
      )
      room.gameId = randomUUID()
      room.gameCompletedAt = null
      room.achievementClaimUrls.clear()
      broadcastRoom(room)
      return
    }

    if (!room.game) throw new ProtocolError('GAME_NOT_STARTED', '游戏尚未开始', message.requestId)
    if (message.type === 'pause_game' && room.hostPlayerId !== player.id) {
      if (room.game.partySession.pausedAt === undefined) {
        room.pauseRequestedPlayerIds.add(player.id)
        broadcastRoom(room)
      }
      return
    }
    if (message.type === 'resume_game' && room.hostPlayerId !== player.id) {
      throw new ProtocolError('HOST_ONLY', '只有主持人可以恢复游戏', message.requestId)
    }
    let command: OnlineGameCommand
    if (message.type === 'submit_prediction') {
      command = { type: message.type, prediction: message.prediction }
    } else if (message.type === 'decide_reaction') {
      command = { type: message.type, decision: message.decision }
    } else if (message.type === 'choose_punishment') {
      command = { type: message.type, selectedIndex: message.selectedIndex }
    } else if (message.type === 'intervene') {
      command = {
        type: message.type,
        action: message.action,
        targetPlayerId: message.targetPlayerId,
      }
    } else if (message.type === 'vote') {
      command = { type: message.type, optionIndex: message.optionIndex }
    } else if (message.type === 'resolve_event') {
      command = { type: message.type, selectedPlayerIds: message.selectedPlayerIds }
    } else if (message.type === 'rps') {
      command = { type: message.type, choice: message.choice }
    } else if (message.type === 'mini_game_memory_answer') {
      command = { type: message.type, sequence: message.sequence }
    } else if (message.type === 'mini_game_quiz_result') {
      command = { type: message.type, completed: message.completed }
    } else if (message.type === 'choose_punishment_count') {
      command = { type: message.type, count: message.count }
    } else if (message.type === 'resolve_condition') {
      command = { type: message.type, conditionMet: message.conditionMet }
    } else if (message.type === 'defer_punishment') {
      command = { type: message.type, defer: message.defer }
    } else if (message.type === 'resolve_content') {
      command = { type: message.type, accepted: message.accepted }
    } else if (message.type === 'decide_mercy') {
      command = { type: message.type, accepted: message.accepted }
    } else {
      command = { type: message.type } as OnlineGameCommand
    }
    updateRoomGame(room, applyOnlineGameCommand(room.game, player.id, command, gameDependencies))
    room.skipRequestedPlayerIds.clear()
    if (message.type === 'pause_game' || message.type === 'resume_game') {
      room.pauseRequestedPlayerIds.clear()
    }
    broadcastRoom(room)
  }

  function updateRoomGame(room: Room, nextGame: OnlineGameState): void {
    const wasFinished = room.game?.status === 'finished'
    room.game = nextGame
    if (!wasFinished && nextGame.status === 'finished') completeRoomGame(room)
  }

  function completeRoomGame(room: Room): void {
    if (!room.game || room.game.status !== 'finished' || room.gameCompletedAt !== null) return
    const completedAt = now()
    room.gameCompletedAt = completedAt
    const claims = options.achievementClaims
    if (!claims || !room.gameId) return

    for (const player of room.players) {
      const settlement = room.game.victorySettlement.find(entry => entry.playerId === player.id)
      const token = createGameCompletionClaim(
        {
          claimId: randomUUID(),
          gameId: room.gameId,
          playerId: player.id,
          rulesetVersion: room.game.rulesetVersion,
          completedAt,
          place:
            room.game.winnerPlayerId === player.id ? 1 : (settlement?.place ?? room.players.length),
          winner: room.game.winnerPlayerId === player.id,
        },
        claims
      )
      room.achievementClaimUrls.set(player.id, buildGameCompletionClaimUrl(claims.claimUrl, token))
    }
  }

  function transferExpiredHost(room: Room, timestamp: number): boolean {
    const hostPlayer = room.players.find(player => player.id === room.hostPlayerId)
    if (
      !hostPlayer ||
      hostPlayer.disconnectedAt === null ||
      timestamp - hostPlayer.disconnectedAt < reconnectGraceMs
    ) {
      return false
    }
    const successor = room.players.find(
      player => player.id !== hostPlayer.id && player.socket?.readyState === WebSocket.OPEN
    )
    if (!successor) return false
    room.hostPlayerId = successor.id
    room.skipRequestedPlayerIds.clear()
    room.pauseRequestedPlayerIds.clear()
    return true
  }

  function broadcastRoom(room: Room): void {
    for (const player of room.players) {
      if (!player.socket) continue
      send(player.socket, {
        type: 'room_state',
        room: projectRoom(room, player.id, now(), reconnectGraceMs),
      })
    }
  }

  const requestedPort = options.port ?? 8787
  const host = options.host ?? '127.0.0.1'
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(requestedPort, host, resolve)
  })
  const address = httpServer.address()
  if (!address || typeof address === 'string') throw new Error('房间服务未获得 TCP 端口')

  return {
    port: address.port,
    wsUrl: `ws://${host}:${address.port}`,
    close: async () => {
      clearInterval(cleanupTimer)
      clearInterval(gameTimer)
      clearInterval(heartbeatTimer)
      for (const socket of webSocketServer.clients) socket.terminate()
      await closeWebSocketServer(webSocketServer)
      await closeHttpServer(httpServer)
    },
  }
}

function projectRoom(
  room: Room,
  viewerId: string,
  now: number,
  reconnectGraceMs: number
): RoomView {
  const removalSafe = room.game ? isOnlinePlayerRemovalSafe(room.game) : true
  return {
    status: room.game?.status ?? 'lobby',
    hostPlayerId: room.hostPlayerId,
    players: room.players.map<RoomPlayerView>(player => {
      const connected = player.socket?.readyState === WebSocket.OPEN
      const graceExpired =
        player.disconnectedAt !== null && now - player.disconnectedAt >= reconnectGraceMs
      const removable =
        !connected && graceExpired && (!room.game || (room.players.length > 2 && removalSafe))
      const removalBlockReason = connected
        ? undefined
        : !graceExpired
          ? ('reconnect_grace' as const)
          : room.game && room.players.length <= 2
            ? ('minimum_players' as const)
            : room.game && !removalSafe
              ? ('unsafe_game_state' as const)
              : undefined
      return {
        id: player.id,
        nickname: player.nickname,
        color: player.color,
        connected,
        disconnectedAt: player.disconnectedAt ?? undefined,
        removable,
        removalBlockReason,
      }
    }),
    settings: projectOnlineRoomSettings(room.settings, room.hostPlayerId === viewerId),
    confirmedPlayerIds: room.players
      .filter(player => room.confirmedPlayerIds.has(player.id))
      .map(player => player.id),
    skipRequestedPlayerIds: [...room.skipRequestedPlayerIds],
    pauseRequestedPlayerIds: [...room.pauseRequestedPlayerIds],
    game: room.game ? projectOnlineGameView(room.game, viewerId) : null,
    achievementClaimUrl: room.achievementClaimUrls.get(viewerId),
  }
}

function createPlayer(
  nicknameValue: string,
  color: string,
  socket: WebSocket,
  requestId: string
): RoomPlayer {
  const nickname = nicknameValue.trim()
  if (!nickname || nickname.length > NICKNAME_MAX_LENGTH) {
    throw new ProtocolError(
      'INVALID_NICKNAME',
      `昵称长度必须为 1–${NICKNAME_MAX_LENGTH} 个字符`,
      requestId
    )
  }
  if (!COLOR_PATTERN.test(color)) {
    throw new ProtocolError('INVALID_COLOR', '颜色必须是 6 位十六进制颜色', requestId)
  }
  return {
    id: randomUUID(),
    resumeToken: randomBytes(24).toString('base64url'),
    nickname,
    color,
    socket,
    disconnectedAt: null,
  }
}

function colorsMatch(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function sendSession(socket: WebSocket, room: Room, player: RoomPlayer, requestId: string): void {
  send(socket, {
    type: 'session',
    requestId,
    roomCode: room.code,
    playerId: player.id,
    resumeToken: player.resumeToken,
    isHost: room.hostPlayerId === player.id,
  })
}

function send(socket: WebSocket | null, message: ServerMessage): void {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

function parseClientMessage(raw: string): ClientMessage {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new ProtocolError('INVALID_MESSAGE', '消息必须是合法 JSON')
  }
  if (!value || typeof value !== 'object')
    throw new ProtocolError('INVALID_MESSAGE', '消息格式无效')
  const message = value as Record<string, unknown>
  const requestId = typeof message.requestId === 'string' ? message.requestId : undefined
  if (!requestId || requestId.length > 64) {
    throw new ProtocolError('INVALID_MESSAGE', 'requestId 无效')
  }
  if (message.type === 'create_room' || message.type === 'join_room') {
    if (typeof message.nickname !== 'string' || typeof message.color !== 'string') {
      throw new ProtocolError('INVALID_MESSAGE', '玩家资料无效', requestId)
    }
    if (message.type === 'join_room') {
      if (typeof message.roomCode !== 'string' || !/^[A-Z2-9]{6}$/i.test(message.roomCode)) {
        throw new ProtocolError('INVALID_ROOM_CODE', '房间码必须是 6 位字符', requestId)
      }
      return {
        type: 'join_room',
        requestId,
        roomCode: message.roomCode,
        nickname: message.nickname,
        color: message.color,
      }
    }
    return { type: 'create_room', requestId, nickname: message.nickname, color: message.color }
  }
  if (message.type === 'resume_room') {
    if (
      typeof message.roomCode !== 'string' ||
      !/^[A-Z2-9]{6}$/i.test(message.roomCode) ||
      typeof message.playerId !== 'string' ||
      !message.playerId ||
      typeof message.resumeToken !== 'string' ||
      !message.resumeToken
    ) {
      throw new ProtocolError('INVALID_MESSAGE', '恢复房间参数无效', requestId)
    }
    return {
      type: 'resume_room',
      requestId,
      roomCode: message.roomCode,
      playerId: message.playerId,
      resumeToken: message.resumeToken,
    }
  }
  if (message.type === 'update_settings') {
    const normalizedSettings = normalizeOnlineRoomSettings(message.settings)
    if (!normalizedSettings) {
      throw new ProtocolError('INVALID_SETTINGS', '房间设置无效', requestId)
    }
    return { type: 'update_settings', requestId, settings: normalizedSettings }
  }
  if (message.type === 'transfer_host') {
    if (typeof message.playerId !== 'string' || !message.playerId) {
      throw new ProtocolError('INVALID_MESSAGE', '接任玩家身份无效', requestId)
    }
    return { type: 'transfer_host', requestId, playerId: message.playerId }
  }
  if (message.type === 'remove_player') {
    if (typeof message.playerId !== 'string' || !message.playerId) {
      throw new ProtocolError('INVALID_MESSAGE', '离场玩家身份无效', requestId)
    }
    return { type: 'remove_player', requestId, playerId: message.playerId }
  }
  if (message.type === 'submit_prediction') {
    if (message.prediction !== 'low' && message.prediction !== 'high') {
      throw new ProtocolError('INVALID_MESSAGE', '预测选项无效', requestId)
    }
    return { type: 'submit_prediction', requestId, prediction: message.prediction }
  }
  if (message.type === 'decide_reaction') {
    if (message.decision !== 'keep' && message.decision !== 'mirror') {
      throw new ProtocolError('INVALID_MESSAGE', '反应决定无效', requestId)
    }
    return { type: 'decide_reaction', requestId, decision: message.decision }
  }
  if (message.type === 'choose_punishment') {
    if (
      message.selectedIndex !== null &&
      message.selectedIndex !== 0 &&
      message.selectedIndex !== 1
    ) {
      throw new ProtocolError('INVALID_MESSAGE', '惩罚选择无效', requestId)
    }
    return { type: 'choose_punishment', requestId, selectedIndex: message.selectedIndex }
  }
  if (message.type === 'choose_punishment_count') {
    if (!Number.isInteger(message.count) || Number(message.count) < 0) {
      throw new ProtocolError('INVALID_MESSAGE', '惩罚次数无效', requestId)
    }
    return { type: 'choose_punishment_count', requestId, count: Number(message.count) }
  }
  if (message.type === 'resolve_condition') {
    if (typeof message.conditionMet !== 'boolean') {
      throw new ProtocolError('INVALID_MESSAGE', '条件结果无效', requestId)
    }
    return { type: 'resolve_condition', requestId, conditionMet: message.conditionMet }
  }
  if (message.type === 'defer_punishment') {
    if (typeof message.defer !== 'boolean') {
      throw new ProtocolError('INVALID_MESSAGE', '延迟惩罚选择无效', requestId)
    }
    return { type: 'defer_punishment', requestId, defer: message.defer }
  }
  if (message.type === 'resolve_content') {
    if (typeof message.accepted !== 'boolean') {
      throw new ProtocolError('INVALID_MESSAGE', '格子内容结果无效', requestId)
    }
    return { type: 'resolve_content', requestId, accepted: message.accepted }
  }
  if (message.type === 'decide_mercy') {
    if (typeof message.accepted !== 'boolean') {
      throw new ProtocolError('INVALID_MESSAGE', '求饶决定无效', requestId)
    }
    return { type: 'decide_mercy', requestId, accepted: message.accepted }
  }
  if (message.type === 'intervene') {
    if (!['transfer', 'amplify', 'immunity'].includes(String(message.action))) {
      throw new ProtocolError('INVALID_MESSAGE', '干预动作无效', requestId)
    }
    if (message.targetPlayerId !== undefined && typeof message.targetPlayerId !== 'string') {
      throw new ProtocolError('INVALID_MESSAGE', '转嫁目标无效', requestId)
    }
    return {
      type: 'intervene',
      requestId,
      action: message.action as 'transfer' | 'amplify' | 'immunity',
      targetPlayerId: message.targetPlayerId,
    }
  }
  if (message.type === 'vote') {
    if (!Number.isInteger(message.optionIndex)) {
      throw new ProtocolError('INVALID_MESSAGE', '投票选项无效', requestId)
    }
    return { type: 'vote', requestId, optionIndex: Number(message.optionIndex) }
  }
  if (message.type === 'resolve_event') {
    if (
      message.selectedPlayerIds !== undefined &&
      (!Array.isArray(message.selectedPlayerIds) ||
        message.selectedPlayerIds.some(playerId => typeof playerId !== 'string'))
    ) {
      throw new ProtocolError('INVALID_MESSAGE', '事件玩家选择无效', requestId)
    }
    return {
      type: 'resolve_event',
      requestId,
      selectedPlayerIds: message.selectedPlayerIds as string[] | undefined,
    }
  }
  if (message.type === 'rps') {
    if (!['rock', 'paper', 'scissors'].includes(String(message.choice))) {
      throw new ProtocolError('INVALID_MESSAGE', '猜拳选项无效', requestId)
    }
    return {
      type: 'rps',
      requestId,
      choice: message.choice as 'rock' | 'paper' | 'scissors',
    }
  }
  if (message.type === 'mini_game_memory_answer') {
    if (
      !Array.isArray(message.sequence) ||
      message.sequence.some(symbol => typeof symbol !== 'string')
    ) {
      throw new ProtocolError('INVALID_MESSAGE', '记忆答案无效', requestId)
    }
    return { type: 'mini_game_memory_answer', requestId, sequence: message.sequence as string[] }
  }
  if (message.type === 'mini_game_quiz_result') {
    if (typeof message.completed !== 'boolean') {
      throw new ProtocolError('INVALID_MESSAGE', '快速问答结果无效', requestId)
    }
    return { type: 'mini_game_quiz_result', requestId, completed: message.completed }
  }
  if (
    message.type === 'start_game' ||
    message.type === 'confirm_settings' ||
    message.type === 'roll_dice' ||
    message.type === 'reroll' ||
    message.type === 'decline_intervention' ||
    message.type === 'acknowledge' ||
    message.type === 'mini_game_press' ||
    message.type === 'tiebreak_roll' ||
    message.type === 'move' ||
    message.type === 'pause_game' ||
    message.type === 'resume_game' ||
    message.type === 'skip_action' ||
    message.type === 'chain_roll' ||
    message.type === 'request_mercy' ||
    message.type === 'acknowledge_event_result'
  ) {
    return { type: message.type, requestId }
  }
  throw new ProtocolError('INVALID_MESSAGE', '未知消息类型', requestId)
}

function createUniqueRoomCode(rooms: ReadonlyMap<string, Room>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = ''
    for (let index = 0; index < 6; index += 1) {
      code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length)]
    }
    if (!rooms.has(code)) return code
  }
  throw new ProtocolError('ROOM_CODE_EXHAUSTED', '暂时无法分配房间码')
}

function normalizeError(error: unknown, requestId?: string): ProtocolError {
  if (error instanceof ProtocolError) return error
  if (error instanceof GameCommandError)
    return new ProtocolError(error.code, error.message, requestId)
  return new ProtocolError('INTERNAL_ERROR', '房间服务处理失败', requestId)
}

function closeWebSocketServer(server: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  )
}

function closeHttpServer(server: HttpServer): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close(error => (error ? reject(error) : resolve()))
  )
}
