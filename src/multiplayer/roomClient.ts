import type { OnlineClientMessage, OnlineServerMessage } from '@flying-chess/game-core'

export type OnlineConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface OnlineRoomClientCallbacks {
  readonly onStatus: (status: OnlineConnectionStatus) => void
  readonly onMessage: (message: OnlineServerMessage) => void
}

export class OnlineRoomClient {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private reconnectAttempt = 0
  private manuallyClosed = false
  private connecting: Promise<void> | null = null

  constructor(
    private readonly serverUrl: string,
    private readonly callbacks: OnlineRoomClientCallbacks
  ) {}

  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return
    if (this.connecting) return this.connecting
    this.manuallyClosed = false
    this.callbacks.onStatus('connecting')
    const socket = new WebSocket(this.serverUrl)
    this.socket = socket
    socket.addEventListener('message', event => {
      if (typeof event.data !== 'string') return
      try {
        this.callbacks.onMessage(JSON.parse(event.data) as OnlineServerMessage)
      } catch {
        // A malformed server frame is ignored; the next authoritative state can still recover the UI.
      }
    })
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null
      this.callbacks.onStatus('disconnected')
      if (!this.manuallyClosed) this.scheduleReconnect()
    })
    this.connecting = new Promise<void>((resolve, reject) => {
      socket.addEventListener(
        'open',
        () => {
          this.reconnectAttempt = 0
          this.callbacks.onStatus('connected')
          resolve()
        },
        { once: true }
      )
      socket.addEventListener('error', () => reject(new Error('无法连接房间服务')), { once: true })
    })
    try {
      await this.connecting
    } finally {
      this.connecting = null
    }
  }

  send(message: OnlineClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('房间服务尚未连接')
    this.socket.send(JSON.stringify(message))
  }

  close(): void {
    this.manuallyClosed = true
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
    this.socket = null
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return
    const delay = Math.min(10_000, 1_000 * 2 ** this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      void this.connect().catch(() => this.scheduleReconnect())
    }, delay)
  }
}
