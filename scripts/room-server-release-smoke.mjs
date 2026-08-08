import WebSocket from 'ws'
import { fileURLToPath } from 'node:url'

class SmokeFailure extends Error {
  constructor(stage, code) {
    super(`${stage}:${code}`)
    this.stage = stage
    this.code = code
  }
}

function fail(stage, code) {
  throw new SmokeFailure(stage, code)
}

function parseArguments(arguments_) {
  const options = { deep: false, timeoutMs: 5_000 }
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--deep') {
      options.deep = true
      continue
    }
    if (argument === '--help') return { help: true }
    const value = arguments_[index + 1]
    if (!value || value.startsWith('--')) fail('arguments', 'MISSING_VALUE')
    index += 1
    if (argument === '--health-url') options.healthUrl = value
    else if (argument === '--ws-url') options.wsUrl = value
    else if (argument === '--origin') options.origin = value
    else if (argument === '--expected-server-version') options.expectedServerVersion = value
    else if (argument === '--expected-protocol-version') {
      options.expectedProtocolVersion = Number(value)
    } else if (argument === '--timeout-ms') options.timeoutMs = Number(value)
    else fail('arguments', 'UNKNOWN_ARGUMENT')
  }

  if (
    !options.healthUrl ||
    !options.wsUrl ||
    !options.expectedServerVersion ||
    !Number.isSafeInteger(options.expectedProtocolVersion) ||
    options.expectedProtocolVersion < 1 ||
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 100 ||
    options.timeoutMs > 60_000
  ) {
    fail('arguments', 'INVALID_ARGUMENT')
  }
  const healthUrl = parseSafeUrl(options.healthUrl, ['http:', 'https:'], 'arguments')
  const wsUrl = parseSafeUrl(options.wsUrl, ['ws:', 'wss:'], 'arguments')
  const origin = options.origin === undefined ? undefined : parseOrigin(options.origin)
  if (!healthUrl.pathname.endsWith('/health')) fail('arguments', 'INVALID_HEALTH_PATH')
  return { ...options, healthUrl, wsUrl, origin }
}

function parseSafeUrl(value, protocols, stage) {
  let url
  try {
    url = new URL(value)
  } catch {
    fail(stage, 'INVALID_URL')
  }
  if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    fail(stage, 'UNSAFE_URL')
  }
  return url
}

function parseOrigin(value) {
  const url = parseSafeUrl(value, ['http:', 'https:'], 'arguments')
  if (url.pathname !== '/') fail('arguments', 'INVALID_ORIGIN')
  return url.origin
}

function withTimeout(timeoutMs, onTimeout) {
  const timer = setTimeout(onTimeout, timeoutMs)
  timer.unref?.()
  return timer
}

async function fetchJson(url, stage, timeoutMs) {
  const controller = new AbortController()
  const timer = withTimeout(timeoutMs, () => controller.abort())
  try {
    const response = await fetch(url, { signal: controller.signal })
    let body
    try {
      body = await response.json()
    } catch {
      fail(stage, 'INVALID_JSON')
    }
    return { response, body }
  } catch (error) {
    if (error instanceof SmokeFailure) throw error
    fail(stage, 'HTTP_FAILED')
  } finally {
    clearTimeout(timer)
  }
}

class SmokeClient {
  constructor(socket, timeoutMs) {
    this.socket = socket
    this.timeoutMs = timeoutMs
    this.messages = []
    this.waiters = []
    socket.on('message', raw => {
      let message
      try {
        message = JSON.parse(raw.toString())
      } catch {
        return
      }
      const waiterIndex = this.waiters.findIndex(waiter => waiter.predicate(message))
      if (waiterIndex < 0) {
        this.messages.push(message)
        return
      }
      const [waiter] = this.waiters.splice(waiterIndex, 1)
      clearTimeout(waiter.timer)
      waiter.resolve(message)
    })
    socket.on('close', () => {
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timer)
        waiter.reject(new SmokeFailure(waiter.stage, 'CONNECTION_CLOSED'))
      }
    })
  }

  static connect(url, timeoutMs, stage, origin) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, origin === undefined ? undefined : { origin })
      const timer = withTimeout(timeoutMs, () => {
        socket.terminate()
        reject(new SmokeFailure(stage, 'CONNECT_TIMEOUT'))
      })
      socket.once('open', () => {
        clearTimeout(timer)
        resolve(new SmokeClient(socket, timeoutMs))
      })
      socket.once('error', () => {
        clearTimeout(timer)
        reject(new SmokeFailure(stage, 'CONNECT_FAILED'))
      })
    })
  }

  send(message, stage) {
    if (this.socket.readyState !== WebSocket.OPEN) fail(stage, 'NOT_CONNECTED')
    this.socket.send(JSON.stringify(message))
  }

  next(predicate, stage) {
    const bufferedIndex = this.messages.findIndex(predicate)
    if (bufferedIndex >= 0) {
      const [message] = this.messages.splice(bufferedIndex, 1)
      return Promise.resolve(message)
    }
    return new Promise((resolve, reject) => {
      const timer = withTimeout(this.timeoutMs, () => {
        const waiterIndex = this.waiters.findIndex(waiter => waiter.timer === timer)
        if (waiterIndex >= 0) this.waiters.splice(waiterIndex, 1)
        reject(new SmokeFailure(stage, 'MESSAGE_TIMEOUT'))
      })
      this.waiters.push({ predicate, stage, resolve, reject, timer })
    })
  }

  close() {
    if (this.socket.readyState === WebSocket.CLOSED) return Promise.resolve()
    return new Promise(resolve => {
      const timer = withTimeout(this.timeoutMs, () => {
        this.socket.terminate()
        resolve()
      })
      this.socket.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
      this.socket.close()
    })
  }
}

function assertPublicProjection(message, privateValues, stage) {
  const serialized = JSON.stringify(message)
  if (Object.hasOwn(message, 'resumeToken') || serialized.includes('resumeToken')) {
    fail(stage, 'PRIVATE_FIELD_EXPOSED')
  }
  if (privateValues.some(value => value && serialized.includes(value))) {
    fail(stage, 'PRIVATE_VALUE_EXPOSED')
  }
}

async function runShallow(options) {
  const health = await fetchJson(options.healthUrl, 'health', options.timeoutMs)
  if (health.response.status !== 200) fail('health', 'UNEXPECTED_STATUS')
  if (health.body?.version !== options.expectedServerVersion) fail('health', 'VERSION_MISMATCH')
  if (health.body?.protocolVersion !== options.expectedProtocolVersion) {
    fail('health', 'PROTOCOL_MISMATCH')
  }

  const readyUrl = new URL(options.healthUrl)
  readyUrl.pathname = readyUrl.pathname.replace(/\/health$/, '/ready')
  const readiness = await fetchJson(readyUrl, 'readiness', options.timeoutMs)
  if (
    readiness.response.status !== 200 ||
    readiness.body?.acceptingNewRooms !== true ||
    readiness.body?.draining !== false
  ) {
    fail('readiness', 'NOT_READY')
  }

  if (!options.deep) {
    const probe = await SmokeClient.connect(
      options.wsUrl,
      options.timeoutMs,
      'websocket',
      options.origin
    )
    await probe.close()
  }
}

async function runDeep(options) {
  const clients = []
  try {
    const host = await SmokeClient.connect(
      options.wsUrl,
      options.timeoutMs,
      'deep.host.connect',
      options.origin
    )
    clients.push(host)
    host.send(
      {
        type: 'create_room',
        requestId: 'smoke-create',
        protocolVersion: options.expectedProtocolVersion,
        nickname: 'SmokeHost',
        color: '#ff6b6b',
      },
      'deep.host.create'
    )
    const hostSession = await host.next(message => message.type === 'session', 'deep.host.session')
    if (
      hostSession.protocolVersion !== options.expectedProtocolVersion ||
      hostSession.serverVersion !== options.expectedServerVersion
    ) {
      fail('deep.host.session', 'VERSION_MISMATCH')
    }

    const guest = await SmokeClient.connect(
      options.wsUrl,
      options.timeoutMs,
      'deep.guest.connect',
      options.origin
    )
    clients.push(guest)
    guest.send(
      {
        type: 'join_room',
        requestId: 'smoke-join',
        protocolVersion: options.expectedProtocolVersion,
        roomCode: hostSession.roomCode,
        nickname: 'SmokeGuest',
        color: '#4ecdc4',
      },
      'deep.guest.join'
    )
    const guestSession = await guest.next(
      message => message.type === 'session',
      'deep.guest.session'
    )
    const hostProjection = await host.next(
      message => message.type === 'room_state' && message.room?.players?.length === 2,
      'deep.host.projection'
    )
    assertPublicProjection(
      hostProjection,
      [guestSession.resumeToken, guestSession.roomCode],
      'deep.host.projection'
    )

    await guest.close()
    const resumed = await SmokeClient.connect(
      options.wsUrl,
      options.timeoutMs,
      'deep.resume.connect',
      options.origin
    )
    clients.push(resumed)
    resumed.send(
      {
        type: 'resume_room',
        requestId: 'smoke-resume',
        protocolVersion: options.expectedProtocolVersion,
        roomCode: guestSession.roomCode,
        playerId: guestSession.playerId,
        resumeToken: guestSession.resumeToken,
      },
      'deep.resume.send'
    )
    const resumedSession = await resumed.next(
      message => message.type === 'session',
      'deep.resume.session'
    )
    if (
      resumedSession.playerId !== guestSession.playerId ||
      !resumedSession.resumeToken ||
      resumedSession.resumeToken === guestSession.resumeToken
    ) {
      fail('deep.resume.session', 'PRIVATE_SESSION_MISMATCH')
    }
    const resumedProjection = await resumed.next(
      message =>
        message.type === 'room_state' &&
        message.room?.players?.some(
          player => player.id === guestSession.playerId && player.connected === true
        ),
      'deep.resume.projection'
    )
    if (
      Object.hasOwn(resumedProjection.room?.settings ?? {}, 'punishmentConfig') ||
      Object.hasOwn(resumedProjection.room?.settings ?? {}, 'traps')
    ) {
      fail('deep.resume.projection', 'HOST_PRIVATE_SETTINGS_EXPOSED')
    }

    const incompatible = await SmokeClient.connect(
      options.wsUrl,
      options.timeoutMs,
      'deep.protocol.connect',
      options.origin
    )
    clients.push(incompatible)
    incompatible.send(
      {
        type: 'create_room',
        requestId: 'smoke-incompatible',
        protocolVersion: options.expectedProtocolVersion + 1,
        nickname: 'SmokeMismatch',
        color: '#45b7d1',
      },
      'deep.protocol.send'
    )
    const rejected = await incompatible.next(
      message => message.type === 'error',
      'deep.protocol.error'
    )
    if (rejected.code !== 'INCOMPATIBLE_PROTOCOL') {
      fail('deep.protocol.error', 'UNSTABLE_ERROR_CODE')
    }
  } finally {
    await Promise.all(clients.map(client => client.close()))
  }
}

export async function runRoomServerReleaseSmoke(options) {
  await runShallow(options)
  if (options.deep) await runDeep(options)
}

function printUsage() {
  console.log(
    'Usage: node scripts/room-server-release-smoke.mjs --health-url <url> --ws-url <url> --expected-server-version <version> --expected-protocol-version <integer> [--origin <http-origin>] [--timeout-ms <ms>] [--deep]'
  )
}

async function runCli() {
  let options
  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    const failure = error instanceof SmokeFailure ? error : new SmokeFailure('arguments', 'FAILED')
    console.error(`[room-server-smoke] FAIL stage=${failure.stage} code=${failure.code}`)
    process.exitCode = 2
    return
  }
  if (options.help) {
    printUsage()
    return
  }
  try {
    await runRoomServerReleaseSmoke(options)
    console.log(
      `[room-server-smoke] PASS mode=${options.deep ? 'deep' : 'shallow'} serverVersion=${options.expectedServerVersion} protocolVersion=${options.expectedProtocolVersion}`
    )
  } catch (error) {
    const failure = error instanceof SmokeFailure ? error : new SmokeFailure('unknown', 'FAILED')
    console.error(`[room-server-smoke] FAIL stage=${failure.stage} code=${failure.code}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli()
}
