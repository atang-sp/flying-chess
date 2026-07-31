import { describe, expect, it } from 'vitest'
import { parseLanPairingAnswer, parseLanPairingOffer } from '../services/networkService'

const description = {
  type: 'offer' as const,
  sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=flying-chess\r\n',
}

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
})
