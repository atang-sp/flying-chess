import { describe, expect, it } from 'vitest'
import { deserializeControllerMessage, deserializeHostMessage } from '../services/syncProtocol'

describe('局域网手柄消息协议', () => {
  it('拒绝类型名称合法但载荷越界的控制消息', () => {
    expect(() =>
      deserializeControllerMessage(JSON.stringify({ type: 'predict', prediction: 'sideways' }))
    ).toThrow('控制消息格式无效')
    expect(() =>
      deserializeControllerMessage(JSON.stringify({ type: 'select_punishment', index: 99 }))
    ).toThrow('控制消息格式无效')
  })

  it('拒绝字段缺失或嵌套状态损坏的主机消息', () => {
    expect(() =>
      deserializeHostMessage(JSON.stringify({ type: 'player_assigned', playerIndex: -1 }))
    ).toThrow('主机消息格式无效')
    expect(() =>
      deserializeHostMessage(
        JSON.stringify({
          type: 'state_update',
          view: { myIndex: 0, pendingAction: { type: 'predict', timeoutSeconds: -1 } },
        })
      )
    ).toThrow('主机消息格式无效')
  })
})
