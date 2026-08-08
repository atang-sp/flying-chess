import type { PartyMomentumEvent } from '@flying-chess/game-core/party-momentum'

type LocalPartyPunishmentCompletedEvent = Extract<
  PartyMomentumEvent,
  { type: 'punishment_completed' }
>

export interface LocalPartyPunishmentMomentumContext {
  readonly participantPlayerIndices: readonly number[]
  readonly amplified: boolean
  readonly chain: boolean
  readonly mutual: boolean
}

interface BeginLocalPartyPunishmentMomentumInput {
  readonly participantPlayerIndices: readonly number[]
  readonly amplified: boolean
  readonly chain: boolean
}

export interface LocalPartyMomentumCompletion {
  begin(input: BeginLocalPartyPunishmentMomentumInput): void
  markAmplified(): void
  setParticipants(playerIndices: readonly number[]): void
  includeParticipants(playerIndices: readonly number[]): void
  defer(): LocalPartyPunishmentMomentumContext | null
  resume(context: LocalPartyPunishmentMomentumContext): void
  complete(): LocalPartyPunishmentCompletedEvent | null
  cancel(): void
}

function normalizeParticipants(playerIndices: readonly number[]): readonly number[] {
  if (
    playerIndices.length === 0 ||
    playerIndices.some(playerIndex => !Number.isInteger(playerIndex) || playerIndex < 0)
  ) {
    throw new Error('本地 Party Momentum 需要有效的实际参与玩家')
  }
  return Object.freeze([...new Set(playerIndices)].sort((left, right) => left - right))
}

function frozenContext(
  context: LocalPartyPunishmentMomentumContext
): LocalPartyPunishmentMomentumContext {
  return Object.freeze({
    ...context,
    participantPlayerIndices: normalizeParticipants(context.participantPlayerIndices),
  })
}

export function createLocalPartyMomentumCompletion(): LocalPartyMomentumCompletion {
  let active: LocalPartyPunishmentMomentumContext | null = null

  return {
    begin(input): void {
      if (active) throw new Error('上一项本地 Party 惩罚尚未完成')
      active = frozenContext({ ...input, mutual: false })
    },
    markAmplified(): void {
      if (!active || active.amplified) return
      active = frozenContext({ ...active, amplified: true })
    },
    setParticipants(playerIndices): void {
      if (!active) return
      active = frozenContext({
        ...active,
        participantPlayerIndices: playerIndices,
        mutual: false,
      })
    },
    includeParticipants(playerIndices): void {
      if (!active) return
      active = frozenContext({
        ...active,
        participantPlayerIndices: [...active.participantPlayerIndices, ...playerIndices],
        mutual: true,
      })
    },
    defer(): LocalPartyPunishmentMomentumContext | null {
      const deferred = active
      active = null
      return deferred
    },
    resume(context): void {
      if (active) throw new Error('无法覆盖尚未完成的本地 Party 惩罚')
      active = frozenContext(context)
    },
    complete(): LocalPartyPunishmentCompletedEvent | null {
      if (!active) return null
      const completed = active
      active = null
      return Object.freeze({
        type: 'punishment_completed',
        participantPlayerIndices: completed.participantPlayerIndices,
        amplified: completed.amplified,
        chain: completed.chain,
        mutual: completed.mutual,
      })
    },
    cancel(): void {
      active = null
    },
  }
}
