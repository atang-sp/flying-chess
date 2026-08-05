import { createHmac, timingSafeEqual } from 'node:crypto'

export const GAME_COMPLETION_CLAIM_ISSUER = 'flying-chess-room-server' as const
export const GAME_COMPLETION_CLAIM_AUDIENCE = 'where-is-my-friends' as const
export const GAME_COMPLETION_CLAIM_EVENT = 'game_completed' as const
export const GAME_COMPLETION_CLAIM_VERSION = 1 as const
export const DEFAULT_GAME_COMPLETION_CLAIM_TTL_MS = 7 * 24 * 60 * 60 * 1_000
export const MAXIMUM_GAME_COMPLETION_CLAIM_TTL_MS = 8 * 24 * 60 * 60 * 1_000

const TOKEN_ALGORITHM = 'HS256' as const
const TOKEN_TYPE = 'JWT' as const
const TOKEN_KEY_ID = 'flying-chess-v1' as const
const TOKEN_HEADER = Object.freeze({ alg: TOKEN_ALGORITHM, typ: TOKEN_TYPE, kid: TOKEN_KEY_ID })
const MINIMUM_SECRET_BYTES = 32
const MAXIMUM_TOKEN_LENGTH = 4_096
const MAXIMUM_IDENTIFIER_BYTES = 128
const MINIMUM_CLAIM_TTL_MS = 1_000
const CLOCK_SKEW_MS = 5 * 60 * 1_000

export interface GameCompletionClaimInput {
  readonly claimId: string
  readonly gameId: string
  readonly playerId: string
  readonly rulesetVersion: string
  readonly completedAt: number
  readonly place: number
  readonly winner: boolean
}

export interface GameCompletionClaimPayload {
  readonly v: typeof GAME_COMPLETION_CLAIM_VERSION
  readonly iss: typeof GAME_COMPLETION_CLAIM_ISSUER
  readonly aud: typeof GAME_COMPLETION_CLAIM_AUDIENCE
  readonly event: typeof GAME_COMPLETION_CLAIM_EVENT
  readonly jti: string
  readonly game_id: string
  readonly player_id: string
  readonly mode: 'online_party'
  readonly ruleset_version: string
  readonly completed_at: number
  readonly place: number
  readonly winner: boolean
  readonly iat: number
  readonly exp: number
}

export interface GameCompletionClaimOptions {
  readonly secret: string
  readonly ttlMs?: number
}

export function validateGameCompletionClaimConfiguration(
  options: GameCompletionClaimOptions & Readonly<{ claimUrl: string }>
): void {
  normalizeSecret(options.secret)
  normalizeClaimUrl(options.claimUrl)
  if (options.ttlMs !== undefined) validateClaimTtl(options.ttlMs)
}

export function createGameCompletionClaim(
  input: GameCompletionClaimInput,
  options: GameCompletionClaimOptions
): string {
  const secret = normalizeSecret(options.secret)
  const ttlMs = options.ttlMs ?? DEFAULT_GAME_COMPLETION_CLAIM_TTL_MS
  validateClaimTtl(ttlMs)
  if (!Number.isSafeInteger(input.completedAt) || input.completedAt < 0) {
    throw new Error('game completion timestamp must be a non-negative integer')
  }
  if (!Number.isSafeInteger(input.place) || input.place < 1) {
    throw new Error('game completion place must be a positive integer')
  }
  for (const [name, value] of [
    ['claimId', input.claimId],
    ['gameId', input.gameId],
    ['playerId', input.playerId],
    ['rulesetVersion', input.rulesetVersion],
  ] as const) {
    if (!value || Buffer.byteLength(value, 'utf8') > MAXIMUM_IDENTIFIER_BYTES) {
      throw new Error(
        `game completion ${name} must contain 1-${MAXIMUM_IDENTIFIER_BYTES} UTF-8 bytes`
      )
    }
  }

  const issuedAt = Math.floor(input.completedAt / 1_000)
  const payload: GameCompletionClaimPayload = {
    v: GAME_COMPLETION_CLAIM_VERSION,
    iss: GAME_COMPLETION_CLAIM_ISSUER,
    aud: GAME_COMPLETION_CLAIM_AUDIENCE,
    event: GAME_COMPLETION_CLAIM_EVENT,
    jti: input.claimId,
    game_id: input.gameId,
    player_id: input.playerId,
    mode: 'online_party',
    ruleset_version: input.rulesetVersion,
    completed_at: issuedAt,
    place: input.place,
    winner: input.winner,
    iat: issuedAt,
    exp: Math.floor((input.completedAt + ttlMs) / 1_000),
  }
  const header = encodeJson(TOKEN_HEADER)
  const body = encodeJson(payload)
  const signature = sign(`${header}.${body}`, secret)
  return `${header}.${body}.${signature}`
}

export function verifyGameCompletionClaim(
  token: string,
  secretValue: string,
  now = Date.now()
): GameCompletionClaimPayload {
  const secret = normalizeSecret(secretValue)
  if (!token || token.length > MAXIMUM_TOKEN_LENGTH) {
    throw new Error('game completion claim is malformed')
  }
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('game completion claim is malformed')
  const [headerPart, bodyPart, signaturePart] = parts
  if (!headerPart || !bodyPart || !signaturePart) {
    throw new Error('game completion claim is malformed')
  }
  const expectedSignature = Buffer.from(sign(`${headerPart}.${bodyPart}`, secret), 'base64url')
  const actualSignature = decodeBase64Url(signaturePart)
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new Error('game completion claim signature is invalid')
  }

  const header = decodeJson(headerPart) as Record<string, unknown>
  if (
    header.alg !== TOKEN_HEADER.alg ||
    header.typ !== TOKEN_HEADER.typ ||
    header.kid !== TOKEN_HEADER.kid
  ) {
    throw new Error('game completion claim header is invalid')
  }
  const payload = decodeJson(bodyPart) as Partial<GameCompletionClaimPayload>
  if (
    payload.v !== GAME_COMPLETION_CLAIM_VERSION ||
    payload.iss !== GAME_COMPLETION_CLAIM_ISSUER ||
    payload.aud !== GAME_COMPLETION_CLAIM_AUDIENCE ||
    payload.event !== GAME_COMPLETION_CLAIM_EVENT ||
    payload.mode !== 'online_party' ||
    !isNonEmptyString(payload.jti) ||
    !isNonEmptyString(payload.game_id) ||
    !isNonEmptyString(payload.player_id) ||
    !isNonEmptyString(payload.ruleset_version) ||
    identifierIsTooLong(payload.jti) ||
    identifierIsTooLong(payload.game_id) ||
    identifierIsTooLong(payload.player_id) ||
    identifierIsTooLong(payload.ruleset_version) ||
    !Number.isSafeInteger(payload.completed_at) ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    !Number.isSafeInteger(payload.place) ||
    Number(payload.place) < 1 ||
    typeof payload.winner !== 'boolean'
  ) {
    throw new Error('game completion claim payload is invalid')
  }
  const nowSeconds = Math.floor(now / 1_000)
  if (
    Number(payload.completed_at) !== Number(payload.iat) ||
    Number(payload.exp) <= Number(payload.iat) ||
    (Number(payload.exp) - Number(payload.iat)) * 1_000 > MAXIMUM_GAME_COMPLETION_CLAIM_TTL_MS ||
    nowSeconds >= Number(payload.exp) ||
    Number(payload.iat) * 1_000 > now + CLOCK_SKEW_MS
  ) {
    throw new Error('game completion claim has expired or has invalid timestamps')
  }
  return payload as GameCompletionClaimPayload
}

export function buildGameCompletionClaimUrl(claimUrl: string, token: string): string {
  const url = normalizeClaimUrl(claimUrl)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''))
  fragment.set('token', token)
  url.hash = fragment.toString()
  return url.toString()
}

function normalizeClaimUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('game completion claim URL must use HTTPS')
  return url
}

function normalizeSecret(value: string): Buffer {
  const secret = Buffer.from(value, 'utf8')
  if (secret.byteLength < MINIMUM_SECRET_BYTES) {
    throw new Error(
      `game completion claim secret must contain at least ${MINIMUM_SECRET_BYTES} bytes`
    )
  }
  return secret
}

function validateClaimTtl(value: number): void {
  if (
    !Number.isSafeInteger(value) ||
    value < MINIMUM_CLAIM_TTL_MS ||
    value > MAXIMUM_GAME_COMPLETION_CLAIM_TTL_MS
  ) {
    throw new Error(
      `game completion claim TTL must be an integer between ${MINIMUM_CLAIM_TTL_MS} and ${MAXIMUM_GAME_COMPLETION_CLAIM_TTL_MS} milliseconds`
    )
  }
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function decodeJson(value: string): unknown {
  try {
    return JSON.parse(decodeBase64Url(value).toString('utf8')) as unknown
  } catch {
    throw new Error('game completion claim JSON is invalid')
  }
}

function decodeBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('game completion claim is malformed')
  return Buffer.from(value, 'base64url')
}

function sign(value: string, secret: Buffer): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function identifierIsTooLong(value: unknown): boolean {
  return typeof value === 'string' && Buffer.byteLength(value, 'utf8') > MAXIMUM_IDENTIFIER_BYTES
}
