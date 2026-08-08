import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ControllerNetworkManager,
  parseLanPairingAnswer,
  parseLanPairingOffer,
} from '../services/networkService'

const description = {
  type: 'offer' as const,
  sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=flying-chess\r\n',
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('原生 WebRTC 局域网配对协议', () => {
  it('只接受同版本、合法房间和匹配 SDP 类型的邀请', () => {
    const offer = JSON.stringify({
      schemaVersion: 1,
      kind: 'offer',
      roomId: 'ABC234',
      peerId: 'LAN-ABC234DEFG',
      description,
    })
    expect(parseLanPairingOffer(offer)).toMatchObject({ roomId: 'ABC234' })
    expect(() => parseLanPairingAnswer(offer)).toThrow('字段无效')
    expect(() =>
      parseLanPairingOffer(JSON.stringify({ ...JSON.parse(offer), roomId: '../bad' }))
    ).toThrow('字段无效')
  })

  it('心跳恢复后从重连中回到已连接且不重复加入', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    class FakeDataChannel {
      readyState: RTCDataChannelState = 'open'
      onopen: (() => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null
      onclose: (() => void) | null = null
      onerror: ((event: Event) => void) | null = null
      send = vi.fn()
      close(): void {
        this.readyState = 'closed'
      }
    }

    class FakePeerConnection {
      static latest: FakePeerConnection | undefined
      iceGatheringState: RTCIceGatheringState = 'complete'
      connectionState: RTCPeerConnectionState = 'connected'
      localDescription: RTCSessionDescription | null = null
      ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null
      onconnectionstatechange: (() => void) | null = null

      constructor() {
        FakePeerConnection.latest = this
      }

      async setRemoteDescription(): Promise<void> {}
      async createAnswer(): Promise<RTCSessionDescriptionInit> {
        return { type: 'answer', sdp: description.sdp }
      }
      async setLocalDescription(value: RTCSessionDescriptionInit): Promise<void> {
        this.localDescription = value as RTCSessionDescription
      }
      addEventListener(): void {}
      removeEventListener(): void {}
      close(): void {
        this.connectionState = 'closed'
      }
    }

    vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
    const onConnected = vi.fn()
    const manager = new ControllerNetworkManager({
      onConnected,
      onDisconnected: vi.fn(),
      onMessage: vi.fn(),
    })
    const offer = JSON.stringify({
      schemaVersion: 1,
      kind: 'offer',
      roomId: 'ABC234',
      peerId: 'LAN-ABC234DEFG',
      description,
    })

    await manager.connect(offer)
    const channel = new FakeDataChannel()
    FakePeerConnection.latest?.ondatachannel?.({ channel } as unknown as RTCDataChannelEvent)
    channel.onopen?.()
    expect(manager.status).toBe('connected')

    vi.advanceTimersByTime(20_000)
    expect(manager.status).toBe('reconnecting')

    channel.onmessage?.({ data: 'ping' } as MessageEvent)
    expect(manager.status).toBe('connected')
    expect(onConnected).toHaveBeenCalledTimes(1)
    expect(channel.send).toHaveBeenCalledWith('"pong"')

    manager.close()
  })
})
