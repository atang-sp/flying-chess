import type { HostMessage, ControllerMessage, ConnectionStatus } from '../types/network'
import {
  serializeHostMessage,
  deserializeHostMessage,
  serializeControllerMessage,
  deserializeControllerMessage,
} from './syncProtocol'
import { devLog } from '../utils/logger'

const HEARTBEAT_INTERVAL_MS = 5_000
const HEARTBEAT_TIMEOUT_MS = 15_000
const MAX_PAIRING_PAYLOAD_CHARS = 120_000
const LAN_RTC_CONFIG: RTCConfiguration = Object.freeze({ iceServers: [] })

export interface LanPairingOffer {
  readonly schemaVersion: 1
  readonly kind: 'offer'
  readonly roomId: string
  readonly peerId: string
  readonly description: RTCSessionDescriptionInit & { readonly type: 'offer' }
}

export interface LanPairingAnswer {
  readonly schemaVersion: 1
  readonly kind: 'answer'
  readonly roomId: string
  readonly peerId: string
  readonly description: RTCSessionDescriptionInit & { readonly type: 'answer' }
}

type LanPairingPayload = LanPairingOffer | LanPairingAnswer

function randomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return [...array].map(byte => chars[byte % chars.length]).join('')
}

function generateRoomId(): string {
  return randomCode(6)
}

function parsePairingPayload<K extends LanPairingPayload['kind']>(
  raw: string,
  expectedKind: K
): Extract<LanPairingPayload, { kind: K }> {
  if (!raw.trim() || raw.length > MAX_PAIRING_PAYLOAD_CHARS) {
    throw new Error('局域网配对数据为空或过大')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('局域网配对数据不是合法 JSON')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('局域网配对数据格式无效')
  const value = parsed as Record<string, unknown>
  const description = value.description as Record<string, unknown> | undefined
  if (
    value.schemaVersion !== 1 ||
    value.kind !== expectedKind ||
    typeof value.roomId !== 'string' ||
    !/^[A-Z2-9]{6}$/.test(value.roomId) ||
    typeof value.peerId !== 'string' ||
    !/^LAN-[A-Z2-9]{10}$/.test(value.peerId) ||
    !description ||
    description.type !== expectedKind ||
    typeof description.sdp !== 'string' ||
    description.sdp.length < 20
  ) {
    throw new Error('局域网配对数据字段无效')
  }
  return parsed as Extract<LanPairingPayload, { kind: K }>
}

export const parseLanPairingOffer = (raw: string): LanPairingOffer =>
  parsePairingPayload(raw, 'offer')

export const parseLanPairingAnswer = (raw: string): LanPairingAnswer =>
  parsePairingPayload(raw, 'answer')

async function waitForIceGatheringComplete(
  connection: RTCPeerConnection,
  timeoutMs = 8_000
): Promise<void> {
  if (connection.iceGatheringState === 'complete') return
  await new Promise<void>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup()
      reject(new Error('局域网候选地址收集超时'))
    }, timeoutMs)
    const handleStateChange = () => {
      if (connection.iceGatheringState !== 'complete') return
      cleanup()
      resolve()
    }
    const cleanup = () => {
      globalThis.clearTimeout(timeout)
      connection.removeEventListener('icegatheringstatechange', handleStateChange)
    }
    connection.addEventListener('icegatheringstatechange', handleStateChange)
  })
}

export interface HostConnectionCallbacks {
  onPlayerConnected: (peerId: string) => void
  onPlayerDisconnected: (peerId: string) => void
  onPlayerMessage: (peerId: string, message: ControllerMessage) => void
}

interface NativeConnection {
  readonly peerConnection: RTCPeerConnection
  readonly channel: RTCDataChannel
}

/**
 * Host-side native WebRTC manager. SDP and ICE candidates are exchanged manually
 * between the two screens, so no PeerJS cloud signalling or external relay is used.
 */
export class HostNetworkManager {
  private connections = new Map<string, NativeConnection>()
  private pendingConnections = new Map<string, RTCPeerConnection>()
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
    return this._roomId ? `LAN-HOST-${this._roomId}` : ''
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
    this.setStatus('connecting')
    this._roomId = generateRoomId()
    this.setStatus('connected')
    return this._roomId
  }

  async createPairingOffer(): Promise<string> {
    if (!this._roomId) throw new Error('请先开启局域网房间')
    const peerId = `LAN-${randomCode(10)}`
    const peerConnection = new RTCPeerConnection(LAN_RTC_CONFIG)
    const channel = peerConnection.createDataChannel('flying-chess-controller', { ordered: true })
    this.pendingConnections.set(peerId, peerConnection)
    this.configureChannel(peerId, peerConnection, channel)

    try {
      await peerConnection.setLocalDescription(await peerConnection.createOffer())
      await waitForIceGatheringComplete(peerConnection)
      const description = peerConnection.localDescription
      if (!description || description.type !== 'offer' || !description.sdp) {
        throw new Error('无法生成局域网配对邀请')
      }
      const payload: LanPairingOffer = {
        schemaVersion: 1,
        kind: 'offer',
        roomId: this._roomId,
        peerId,
        description: { type: 'offer', sdp: description.sdp },
      }
      return JSON.stringify(payload)
    } catch (error) {
      this.pendingConnections.delete(peerId)
      peerConnection.close()
      throw error
    }
  }

  async acceptPairingAnswer(raw: string): Promise<void> {
    const answer = parseLanPairingAnswer(raw)
    if (answer.roomId !== this._roomId) throw new Error('配对应答不属于当前房间')
    const peerConnection = this.pendingConnections.get(answer.peerId)
    if (!peerConnection) throw new Error('配对邀请已失效，请重新生成')
    await peerConnection.setRemoteDescription(answer.description)
  }

  private configureChannel(
    peerId: string,
    peerConnection: RTCPeerConnection,
    channel: RTCDataChannel
  ): void {
    channel.onopen = () => {
      this.pendingConnections.delete(peerId)
      this.connections.set(peerId, { peerConnection, channel })
      this.startHeartbeat(peerId)
      this.callbacks.onPlayerConnected(peerId)
    }
    channel.onmessage = event => {
      const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
      if (data === '"pong"' || data === 'pong') {
        this.lastPong.set(peerId, Date.now())
        return
      }
      try {
        this.callbacks.onPlayerMessage(peerId, deserializeControllerMessage(data))
      } catch (error) {
        devLog('[LAN Host] Failed to parse message:', data, error)
      }
    }
    channel.onclose = () => this.removeConnection(peerId)
    channel.onerror = error => {
      devLog('[LAN Host] Data channel error:', error)
      this.removeConnection(peerId)
    }
    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peerConnection.connectionState)) {
        this.removeConnection(peerId)
      }
    }
  }

  private startHeartbeat(peerId: string): void {
    this.lastPong.set(peerId, Date.now())
    const timer = setInterval(() => {
      const connection = this.connections.get(peerId)
      if (!connection || connection.channel.readyState !== 'open') {
        this.removeConnection(peerId)
        return
      }
      if (Date.now() - (this.lastPong.get(peerId) ?? 0) > HEARTBEAT_TIMEOUT_MS) {
        this.removeConnection(peerId)
        return
      }
      connection.channel.send('"ping"')
    }, HEARTBEAT_INTERVAL_MS)
    this.heartbeatTimers.set(peerId, timer)
  }

  private removeConnection(peerId: string): void {
    const timer = this.heartbeatTimers.get(peerId)
    if (timer) clearInterval(timer)
    this.heartbeatTimers.delete(peerId)
    this.lastPong.delete(peerId)
    const connection = this.connections.get(peerId)
    if (!connection) return
    this.connections.delete(peerId)
    if (connection.channel.readyState !== 'closed') connection.channel.close()
    if (connection.peerConnection.connectionState !== 'closed') connection.peerConnection.close()
    this.callbacks.onPlayerDisconnected(peerId)
  }

  sendTo(peerId: string, message: HostMessage): void {
    const channel = this.connections.get(peerId)?.channel
    if (channel?.readyState !== 'open') return
    try {
      channel.send(serializeHostMessage(message))
    } catch (error) {
      devLog('[LAN Host] Failed to send:', error)
    }
  }

  broadcast(message: HostMessage): void {
    for (const peerId of this.connections.keys()) this.sendTo(peerId, message)
  }

  isConnected(peerId: string): boolean {
    return this.connections.get(peerId)?.channel.readyState === 'open'
  }

  close(): void {
    for (const peerId of [...this.connections.keys()]) this.removeConnection(peerId)
    for (const peerConnection of this.pendingConnections.values()) peerConnection.close()
    this.pendingConnections.clear()
    this.setStatus('disconnected')
    devLog('[LAN Host] Network manager closed')
  }
}

export interface ControllerConnectionCallbacks {
  onConnected: () => void
  onDisconnected: () => void
  onMessage: (message: HostMessage) => void
}

export class ControllerNetworkManager {
  private peerConnection: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastPing = 0
  private callbacks: ControllerConnectionCallbacks
  private _status: ConnectionStatus = 'disconnected'
  private statusListeners = new Set<(status: ConnectionStatus) => void>()
  private _roomId = ''
  private didConnect = false

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

  async connect(rawOffer: string): Promise<string> {
    const offer = parseLanPairingOffer(rawOffer)
    this._roomId = offer.roomId
    this.setStatus('connecting')
    const peerConnection = new RTCPeerConnection(LAN_RTC_CONFIG)
    this.peerConnection = peerConnection
    peerConnection.ondatachannel = event => this.configureChannel(event.channel)
    peerConnection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(peerConnection.connectionState)) this.handleDisconnected()
    }

    try {
      await peerConnection.setRemoteDescription(offer.description)
      await peerConnection.setLocalDescription(await peerConnection.createAnswer())
      await waitForIceGatheringComplete(peerConnection)
      const description = peerConnection.localDescription
      if (!description || description.type !== 'answer' || !description.sdp) {
        throw new Error('无法生成局域网配对应答')
      }
      const answer: LanPairingAnswer = {
        schemaVersion: 1,
        kind: 'answer',
        roomId: offer.roomId,
        peerId: offer.peerId,
        description: { type: 'answer', sdp: description.sdp },
      }
      return JSON.stringify(answer)
    } catch (error) {
      this.close()
      throw error
    }
  }

  private configureChannel(channel: RTCDataChannel): void {
    this.channel = channel
    channel.onopen = () => {
      this.didConnect = true
      this.setStatus('connected')
      this.startHeartbeatListener()
      this.callbacks.onConnected()
    }
    channel.onmessage = event => {
      const data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
      if (data === '"ping"' || data === 'ping') {
        this.lastPing = Date.now()
        if (channel.readyState === 'open') {
          if (this._status === 'reconnecting') this.setStatus('connected')
          channel.send('"pong"')
        }
        return
      }
      try {
        this.callbacks.onMessage(deserializeHostMessage(data))
      } catch (error) {
        devLog('[LAN Controller] Failed to parse message:', data, error)
      }
    }
    channel.onclose = () => this.handleDisconnected()
    channel.onerror = error => {
      devLog('[LAN Controller] Data channel error:', error)
      this.handleDisconnected()
    }
  }

  private handleDisconnected(): void {
    const shouldNotify = this.didConnect
    this.didConnect = false
    this.stopHeartbeatListener()
    this.setStatus('disconnected')
    if (shouldNotify) this.callbacks.onDisconnected()
  }

  private startHeartbeatListener(): void {
    this.lastPing = Date.now()
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPing > HEARTBEAT_TIMEOUT_MS) this.setStatus('reconnecting')
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeatListener(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  send(message: ControllerMessage): void {
    if (this.channel?.readyState !== 'open') return
    try {
      this.channel.send(serializeControllerMessage(message))
    } catch (error) {
      devLog('[LAN Controller] Failed to send:', error)
    }
  }

  close(): void {
    this.stopHeartbeatListener()
    if (this.channel?.readyState !== 'closed') this.channel?.close()
    this.channel = null
    if (this.peerConnection?.connectionState !== 'closed') this.peerConnection?.close()
    this.peerConnection = null
    this.didConnect = false
    this.setStatus('disconnected')
  }
}
