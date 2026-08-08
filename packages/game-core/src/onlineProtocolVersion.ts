export const CURRENT_ONLINE_PROTOCOL_VERSION = 1
export const MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION = 1

/**
 * Resolves the protocol used by a session-establishing message.
 *
 * Missing values temporarily map to v1 so pages opened before protocol
 * negotiation was introduced can still create, join, or resume. Remove this
 * undefined branch when the documented legacy compatibility window closes.
 */
export function resolveOnlineProtocolVersion(value: unknown): number | null {
  if (value === undefined) return CURRENT_ONLINE_PROTOCOL_VERSION
  if (!Number.isSafeInteger(value)) return null
  const version = Number(value)
  if (
    version < MIN_SUPPORTED_ONLINE_PROTOCOL_VERSION ||
    version > CURRENT_ONLINE_PROTOCOL_VERSION
  ) {
    return null
  }
  return version
}
