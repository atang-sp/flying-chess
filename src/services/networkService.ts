import Peer, { type DataConnection } from 'peerjs'
import type { HostMessage, ControllerMessage, ConnectionStatus } from '../types/network'
import {
  serializeHostMessage,
  deserializeHostMessage,
  serializeControllerMessage,
  deserializeControllerMessage,
} from './syncProtocol'
import { devLog } from '../utils/logger'

const PEER_ID_PREFIX = 'flying-chess-'
const HEARTBEAT_INTERVAL_MS = 5_000
const HEARTBEAT_TIMEOUT_MS = 15_000

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of array) {
    id += chars[byte % chars.length]
  }
  return id
}

// --- Host-side network manager ---

export interface HostConnectionCallbacks {
  onPlayerConnected: (peerId: string) => void
  onPlayerDisconnected: (peerId: string) => void
  onPlayerMessage: (peerId: string, message: ControllerMessage) => void
}

export class HostNetworkManager {
  private peer: Peer | null = null
  private connections = new Map<string, DataConnection>()
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>()
  private lastPong = new Map<string, number>()
  private callbacks: HostConnectionCallbacks
  private _roomId = ''
  private _status: ConnectionStatus = 'disconnected'
  private statusListeners = new Set<(status: ConnectionStatus) => void>()

  constructor(callbacks: HostConnectionCallbacks) {
    this.callbacks = callbacks
  }

  get roomId(): string {
    return this._roomId
  }

  get hostPeerId(): string {
    return this.peer?.id ?? ''
  }

  get status(): ConnectionStatus {
    return this._status
  }

  get connectedPeerIds(): string[] {
    return [...this.connections.keys()]
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status
    for (const listener of this.statusListeners) listener(status)
  }

  async open(): Promise<string> {
    this._roomId = generateRoomId()
    const peerId = PEER_ID_PREFIX + this._roomId

    return new Promise<string>((resolve, reject) => {
      this.setStatus('connecting')
      this.peer = new Peer(peerId)

      this.peer.on('open', (id) => {
        devLog('[Host] Peer opened with ID:', id)
        this.setStatus('connected')
        resolve(this._roomId)
      })

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn)
      })

      this.peer.on('error', (err) => {
        devLog('[Host] Peer error:', err)
        if (this._status === 'connecting') {
          reject(err)
        }
      })

      this.peer.on('disconnected', () => {
        devLog('[Host] Peer disconnected from signaling, attempting reconnect...')
        this.setStatus('reconnecting')
        this.peer?.reconnect()
      })
    })
  }

  private handleIncomingConnection(conn: DataConnection): void {
    devLog('[Host] Incoming connection from:', conn.peer)

    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      this.startHeartbeat(conn.peer)
      this.callbacks.onPlayerConnected(conn.peer)
    })

    conn.on('data', (rawData) => {
      const data = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
      if (data === '"pong"' || data === 'pong') {
        this.lastPong.set(conn.peer, Date.now())
        return
      }
      try {
        const msg = deserializeControllerMessage(data)
        this.callbacks.onPlayerMessage(conn.peer, msg)
      } catch (e) {
        devLog('[Host] Failed to parse message:', data, e)
      }
    })

    conn.on('close', () => {
      this.removeConnection(conn.peer)
    })

    conn.on('error', (err) => {
      devLog('[Host] Connection error with', conn.peer, err)
      this.removeConnection(conn.peer)
    })
  }

  private startHeartbeat(peerId: string): void {
    this.lastPong.set(peerId, Date.now())
    const timer = setInterval(() => {
      const conn = this.connections.get(peerId)
      if (!conn || !conn.open) {
        this.removeConnection(peerId)
        return
      }
      const lastSeen = this.lastPong.get(peerId) ?? 0
      if (Date.now() - lastSeen > HEARTBEAT_TIMEOUT_MS) {
        devLog('[Host] Heartbeat timeout for', peerId)
        this.removeConnection(peerId)
        return
      }
      try {
        conn.send('"ping"')
      } catch {
        this.removeConnection(peerId)
      }
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatTimers.set(peerId, timer)
  }

  private removeConnection(peerId: string): void {
    const timer = this.heartbeatTimers.get(peerId)
    if (timer) clearInterval(timer)
    this.heartbeatTimers.delete(peerId)
    this.lastPong.delete(peerId)

    const conn = this.connections.get(peerId)
    if (conn) {
      this.connections.delete(peerId)
      try {
        conn.close()
      } catch {
        /* already closed */
      }
      this.callbacks.onPlayerDisconnected(peerId)
    }
  }

  sendTo(peerId: string, message: HostMessage): void {
    const conn = this.connections.get(peerId)
    if (!conn || !conn.open) return
    try {
      conn.send(serializeHostMessage(message))
    } catch (e) {
      devLog('[Host] Failed to send to', peerId, e)
    }
  }

  broadcast(message: HostMessage): void {
    const data = serializeHostMessage(message)
    for (const [, conn] of this.connections) {
      if (conn.open) {
        try {
          conn.send(data)
        } catch {
          /* ignore */
        }
      }
    }
  }

  isConnected(peerId: string): boolean {
    const conn = this.connections.get(peerId)
    return conn?.open === true
  }

  close(): void {
    for (const peerId of [...this.connections.keys()]) {
      this.removeConnection(peerId)
    }
    this.peer?.destroy()
    this.peer = null
    this.setStatus('disconnected')
    devLog('[Host] Network manager closed')
  }
}

// --- Controller-side network manager ---

export interface ControllerConnectionCallbacks {
  onConnected: () => void
  onDisconnected: () => void
  onMessage: (message: HostMessage) => void
}

export class ControllerNetworkManager {
  private peer: Peer | null = null
  private connection: DataConnection | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastPing = 0
  private callbacks: ControllerConnectionCallbacks
  private _status: ConnectionStatus = 'disconnected'
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private _roomId = ''

  constructor(callbacks: ControllerConnectionCallbacks) {
    this.callbacks = callbacks
  }

  get status(): ConnectionStatus {
    return this._status
  }

  get roomId(): string {
    return this._roomId
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status
    for (const listener of this.statusListeners) listener(status)
  }

  async connect(roomId: string): Promise<void> {
    this._roomId = roomId
    const hostPeerId = PEER_ID_PREFIX + roomId

    return new Promise<void>((resolve, reject) => {
      this.setStatus('connecting')
      this.peer = new Peer()

      this.peer.on('open', () => {
        devLog('[Controller] Peer opened, connecting to host:', hostPeerId)
        const conn = this.peer!.connect(hostPeerId, { reliable: true })
        this.connection = conn

        conn.on('open', () => {
          devLog('[Controller] Connected to host')
          this.setStatus('connected')
          this.startHeartbeatListener()
          this.callbacks.onConnected()
          resolve()
        })

        conn.on('data', (rawData) => {
          const data = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
          if (data === '"ping"' || data === 'ping') {
            this.lastPing = Date.now()
            try {
              conn.send('"pong"')
            } catch {
              /* ignore */
            }
            return
          }
          try {
            const msg = deserializeHostMessage(data)
            this.callbacks.onMessage(msg)
          } catch (e) {
            devLog('[Controller] Failed to parse message:', data, e)
          }
        })

        conn.on('close', () => {
          devLog('[Controller] Connection closed')
          this.setStatus('disconnected')
          this.stopHeartbeatListener()
          this.callbacks.onDisconnected()
        })

        conn.on('error', (err) => {
          devLog('[Controller] Connection error:', err)
          if (this._status === 'connecting') {
            reject(err)
          }
          this.setStatus('disconnected')
          this.callbacks.onDisconnected()
        })
      })

      this.peer.on('error', (err) => {
        devLog('[Controller] Peer error:', err)
        if (this._status === 'connecting') {
          reject(err)
        }
      })

      this.peer.on('disconnected', () => {
        devLog('[Controller] Peer disconnected from signaling')
        this.setStatus('reconnecting')
        this.peer?.reconnect()
      })
    })
  }

  private startHeartbeatListener(): void {
    this.lastPing = Date.now()
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPing > HEARTBEAT_TIMEOUT_MS) {
        devLog('[Controller] Heartbeat timeout, host may be unreachable')
        this.setStatus('reconnecting')
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeatListener(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  send(message: ControllerMessage): void {
    if (!this.connection?.open) return
    try {
      this.connection.send(serializeControllerMessage(message))
    } catch (e) {
      devLog('[Controller] Failed to send:', e)
    }
  }

  close(): void {
    this.stopHeartbeatListener()
    this.connection?.close()
    this.connection = null
    this.peer?.destroy()
    this.peer = null
    this.setStatus('disconnected')
  }
}
