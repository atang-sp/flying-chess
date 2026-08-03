import { MODE_POLICIES, type RulesetVersion } from '@flying-chess/game-core/config'

export type { RulesetVersion } from '@flying-chess/game-core/config'

export const GAME_MODES = ['classic', 'party'] as const

export type GameMode = (typeof GAME_MODES)[number]

export const DEFAULT_GAME_MODE: GameMode = 'classic'

export const RULESET_VERSION_BY_MODE: Readonly<Record<GameMode, RulesetVersion>> = Object.freeze({
  classic: MODE_POLICIES.classic.rulesetVersion,
  party: MODE_POLICIES.party.rulesetVersion,
})
