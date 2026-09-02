import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import { CURRENT_ONLINE_PROTOCOL_VERSION } from '@flying-chess/game-core'

function waitForListeningPort(child: ChildProcessWithoutNullStreams): Promise<number> {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(() => reject(new Error('room-server CLI did not start')), 5_000)
    child.stdout.on('data', chunk => {
      output += chunk.toString()
      const match = output.match(/room server listening on port (\d+)/)
      if (!match) return
      clearTimeout(timer)
      resolve(Number(match[1]))
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timer)
      reject(new Error(`room-server CLI exited before listening: ${code ?? signal}`))
    })
  })
}

async function waitForJsonMessage(socket: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('room-server message timed out')), 2_000)
    socket.once('message', raw => {
      clearTimeout(timer)
      resolve(JSON.parse(raw.toString()) as Record<string, unknown>)
    })
  })
}

async function waitForDrainingReadiness(httpUrl: string): Promise<void> {
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${httpUrl}/ready`)
      if (response.status === 503) return
    } catch {
      // A pre-change server can close before exposing drain; the deadline reports that failure.
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error('room-server CLI never exposed draining readiness')
}

describe('room server CLI lifecycle', () => {
  let child: ChildProcessWithoutNullStreams | undefined
  let socket: WebSocket | undefined

  afterEach(async () => {
    socket?.terminate()
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
      await new Promise(resolve => child?.once('exit', resolve))
    }
  })

  it('handles repeated termination signals with one bounded graceful drain', async () => {
    const runningChild = spawn(
      process.execPath,
      ['--import', 'tsx', 'apps/room-server/src/cli.ts'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          HOST: '127.0.0.1',
          PORT: '0',
          // Keep a deterministic readiness window before the bounded close. A 100 ms window
          // flakes when process startup or loopback fetches contend with the full test suite.
          ROOM_DRAIN_TIMEOUT_MS: '500',
          ROOM_SERVER_VERSION: '1.15.0-test',
          ROOM_SERVER_BUILD_SHA: 'abc1234',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    )
    child = runningChild
    const port = await waitForListeningPort(runningChild)
    const httpUrl = `http://127.0.0.1:${port}`
    socket = new WebSocket(`ws://127.0.0.1:${port}`)
    await new Promise<void>((resolve, reject) => {
      socket?.once('open', resolve)
      socket?.once('error', reject)
    })
    socket.send(
      JSON.stringify({
        type: 'create_room',
        requestId: 'cli-drain-create',
        protocolVersion: CURRENT_ONLINE_PROTOCOL_VERSION,
        nickname: '信号测试玩家',
        color: '#ff6b6b',
      })
    )
    expect(await waitForJsonMessage(socket)).toMatchObject({ type: 'session' })

    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve =>
      runningChild.once('exit', (code, signal) => resolve({ code, signal }))
    )
    runningChild.kill('SIGTERM')
    await waitForDrainingReadiness(httpUrl)
    runningChild.kill('SIGTERM')
    const health = await fetch(`${httpUrl}/health`)
    expect(health.status).toBe(200)

    await expect(exited).resolves.toEqual({ code: 0, signal: null })
  }, 10_000)
})
