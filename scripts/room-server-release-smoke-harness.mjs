import { spawn } from 'node:child_process'

const expectedServerVersion = '1.15.0-smoke'
const expectedProtocolVersion = 1
const allowedOrigin = 'https://smoke.example'

function waitForListeningPort(child, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(
      () => reject(new Error('ephemeral room server start timed out')),
      timeoutMs
    )
    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
      const match = stdout.match(/room server listening on port (\d+)/)
      if (!match) return
      clearTimeout(timer)
      resolve(Number(match[1]))
    })
    child.stderr.on('data', chunk => {
      stderr = `${stderr}${chunk.toString()}`.slice(-2_000)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      reject(
        new Error(`ephemeral room server exited before listening: ${code ?? signal} ${stderr}`)
      )
    })
  })
}

function waitForExit(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode })
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('child process exit timed out')), timeoutMs)
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal })
    })
  })
}

function runSmoke(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/room-server-release-smoke.mjs', ...arguments_],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('release smoke process timed out'))
    }, 10_000)
    child.stdout.on('data', chunk => {
      stdout = `${stdout}${chunk.toString()}`.slice(-4_000)
    })
    child.stderr.on('data', chunk => {
      stderr = `${stderr}${chunk.toString()}`.slice(-4_000)
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`release smoke failed: ${code ?? signal} ${stderr}`))
        return
      }
      resolve(stdout)
    })
  })
}

const server = spawn(process.execPath, ['apps/room-server/dist/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: '0',
    ROOM_SERVER_VERSION: expectedServerVersion,
    ROOM_SERVER_BUILD_SHA: 'abcdef1234567890',
    ROOM_DRAIN_TIMEOUT_MS: '500',
    ALLOWED_ORIGINS: allowedOrigin,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

try {
  const port = await waitForListeningPort(server)
  const httpUrl = `http://127.0.0.1:${port}`
  const commonArguments = [
    '--health-url',
    `${httpUrl}/health`,
    '--ws-url',
    `ws://127.0.0.1:${port}`,
    '--expected-server-version',
    expectedServerVersion,
    '--expected-protocol-version',
    String(expectedProtocolVersion),
    '--origin',
    allowedOrigin,
    '--timeout-ms',
    '3000',
  ]
  const shallowOutput = await runSmoke(commonArguments)
  if (!String(shallowOutput).includes('PASS mode=shallow')) {
    throw new Error('release smoke did not report shallow PASS')
  }
  const deepOutput = await runSmoke([...commonArguments, '--deep'])
  if (!String(deepOutput).includes('PASS mode=deep')) {
    throw new Error('release smoke did not report deep PASS')
  }

  server.kill('SIGTERM')
  const exit = await waitForExit(server)
  if (exit.code !== 0 || exit.signal !== null) {
    throw new Error(`ephemeral room server did not exit cleanly: ${exit.code ?? exit.signal}`)
  }
  await fetch(`${httpUrl}/health`).then(
    () => {
      throw new Error('ephemeral room server port remained open after shutdown')
    },
    () => undefined
  )
  console.log('room-server release smoke harness PASS')
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL')
    await waitForExit(server).catch(() => undefined)
  }
}
