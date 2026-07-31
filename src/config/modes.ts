export const GAME_MODES = ['classic', 'party'] as const

export type GameMode = (typeof GAME_MODES)[number]
export type RulesetVersion = 'classic_v1' | 'party_v2'

export const DEFAULT_GAME_MODE: GameMode = 'classic'

export const RULESET_VERSION_BY_MODE: Readonly<Record<GameMode, RulesetVersion>> = Object.freeze({
  classic: 'classic_v1',
  party: 'party_v2',
})
