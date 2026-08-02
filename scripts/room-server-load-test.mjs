import { spawn } from 'node:child_process'
import { randomInt } from 'node:crypto'
import WebSocket from 'ws'

const roomCount = 20
const playersPerRoom = 8
const maximumRssBytes = 128 * 1024 * 1024
const maximumP95Ms = 500
const port = randomInt(20_000, 40_000)
const httpUrl = `http://127.0.0.1:${port}`
const wsUrl = `ws://127.0.0.1:${port}`
const server = spawn(process.execPath, ['apps/room-server/dist/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: 'production',
    ALLOWED_ORIGINS: 'http://load.test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const clients = []

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * percentileValue) - 1)] ?? Infinity
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${httpUrl}/health`)
      if (response.ok) return
    } catch {
      // The child process is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('房间服务未在 5 秒内就绪')
}

async function connectClient() {
  const socket = new WebSocket(wsUrl, { origin: 'http://load.test' })
  await new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  clients.push(socket)
  return socket
}

function waitForMessage(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage)
      reject(new Error('等待房间同步超时'))
    }, 5_000)
    function onMessage(raw) {
      const message = JSON.parse(raw.toString())
      if (!predicate(message)) return
      clearTimeout(timeout)
      socket.off('message', onMessage)
      resolve(message)
    }
    socket.on('message', onMessage)
  })
}

async function sendAndWaitForAll(socket, message, observers, statePredicate, responsePredicate) {
  const stateWaits = observers.map(observer => waitForMessage(observer, statePredicate))
  const responseWait = responsePredicate ? waitForMessage(socket, responsePredicate) : null
  const started = performance.now()
  socket.send(JSON.stringify(message))
  const [response] = await Promise.all([responseWait, Promise.all(stateWaits)])
  return { response, latencyMs: performance.now() - started }
}

try {
  await waitForHealth()
  const rooms = []
  const latencies = []
  const colors = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#feca57',
    '#ff9ff3',
    '#54a0ff',
    '#5f27cd',
  ]

  for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
    const host = await connectClient()
    const created = await sendAndWaitForAll(
      host,
      {
        type: 'create_room',
        requestId: `create-${roomIndex}`,
        nickname: `P${roomIndex}-0`,
        color: colors[0],
      },
      [host],
      message => message.type === 'room_state' && message.room.players.length === 1,
      message => message.type === 'session'
    )
    latencies.push(created.latencyMs)
    rooms.push({
      code: created.response.roomCode,
      clients: [host],
      playerIds: [created.response.playerId],
    })
  }

  for (const [roomIndex, room] of rooms.entries()) {
    for (let playerIndex = 1; playerIndex < playersPerRoom; playerIndex += 1) {
      const client = await connectClient()
      const observers = [...room.clients, client]
      const joined = await sendAndWaitForAll(
        client,
        {
          type: 'join_room',
          requestId: `join-${roomIndex}-${playerIndex}`,
          roomCode: room.code,
          nickname: `P${roomIndex}-${playerIndex}`,
          color: colors[playerIndex],
        },
        observers,
        message => message.type === 'room_state' && message.room.players.length === playerIndex + 1,
        message => message.type === 'session'
      )
      latencies.push(joined.latencyMs)
      room.clients.push(client)
      room.playerIds.push(joined.response.playerId)
    }
  }

  for (const [roomIndex, room] of rooms.entries()) {
    for (const [playerIndex, client] of room.clients.entries()) {
      const playerId = room.playerIds[playerIndex]
      const confirmed = await sendAndWaitForAll(
        client,
        { type: 'confirm_settings', requestId: `confirm-${roomIndex}-${playerIndex}` },
        room.clients,
        message =>
          message.type === 'room_state' && message.room.confirmedPlayerIds.includes(playerId)
      )
      latencies.push(confirmed.latencyMs)
    }
  }

  const healthResponse = await fetch(`${httpUrl}/health`)
  const health = await healthResponse.json()
  const p95Ms = percentile(latencies, 0.95)
  const result = {
    rooms: health.rooms,
    connections: health.connections,
    rssMiB: Number((health.rssBytes / 1024 / 1024).toFixed(1)),
    p95Ms: Number(p95Ms.toFixed(1)),
    samples: latencies.length,
  }
  console.log(JSON.stringify(result))
  if (health.rooms !== roomCount || health.connections !== roomCount * playersPerRoom) {
    throw new Error('房间或连接数量未达到压测目标')
  }
  if (health.rssBytes >= maximumRssBytes) throw new Error('RSS 超过 128 MiB 硬门槛')
  if (p95Ms >= maximumP95Ms) throw new Error('P95 同步延迟超过 500 ms 硬门槛')
} finally {
  for (const client of clients) client.close()
  server.kill('SIGTERM')
  if (server.exitCode === null && server.signalCode === null) {
    await new Promise(resolve => server.once('exit', resolve))
  }
}
