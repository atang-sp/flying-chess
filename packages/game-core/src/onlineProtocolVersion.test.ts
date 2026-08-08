import { describe, expect, it } from 'vitest'
import {
  CURRENT_ONLINE_PROTOCOL_VERSION,
  MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION,
  resolveOnlineProtocolVersion,
} from './onlineProtocolVersion'

describe('online protocol version contract', () => {
  it('uses protocol v1 for the temporary missing-field migration path', () => {
    expect(CURRENT_ONLINE_PROTOCOL_VERSION).toBe(1)
    expect(MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION).toBe(1)
    expect(resolveOnlineProtocolVersion(undefined)).toBe(1)
  })

  it.each([
    ['string', '1'],
    ['fraction', 1.5],
    ['negative', -1],
    ['too old', 0],
    ['too new', 2],
    ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects an explicit %s protocol version', (_label, value) => {
    expect(resolveOnlineProtocolVersion(value)).toBeNull()
  })
})
