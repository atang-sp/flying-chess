import { afterEach, describe, expect, it, vi } from 'vitest'
import { OnlineRoomClient } from '../multiplayer/roomClient'

type Listener = (event: { readonly data?: unknown }) => void

class FakeWebSocket {
  static readonly OPEN = 1
  static readonly instances: FakeWebSocket[] = []

  readonly listeners = new Map<string, Listener[]>()
  readyState = 0

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  send(): void {}

  close(): void {
    this.readyState = 3
  }

  emit(type: string, data?: unknown): void {
    if (type === 'open') this.readyState = FakeWebSocket.OPEN
    if (type === 'close') this.readyState = 3
    for (const listener of this.listeners.get(type) ?? []) listener({ data })
  }
}

afterEach(() => {
  FakeWebSocket.instances.length = 0
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('OnlineRoomClient', () => {
  it('新连接成功后忽略旧 socket 的迟到 close 事件', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('window', {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    })
    const statuses: string[] = []
    const client = new OnlineRoomClient('ws://example.test', {
      onStatus: status => statuses.push(status),
      onMessage: () => undefined,
    })

    const firstConnection = client.connect()
    const firstSocket = FakeWebSocket.instances[0]
    if (!firstSocket) throw new Error('expected first socket')
    firstSocket.emit('error')
    await expect(firstConnection).rejects.toThrow('无法连接房间服务')

    const secondConnection = client.connect()
    const secondSocket = FakeWebSocket.instances[1]
    if (!secondSocket) throw new Error('expected second socket')
    secondSocket.emit('open')
    await secondConnection
    firstSocket.emit('close')

    expect(statuses.at(-1)).toBe('connected')
    expect(vi.getTimerCount()).toBe(0)
  })
})
