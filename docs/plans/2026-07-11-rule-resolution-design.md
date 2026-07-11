# Trustworthy Rule Resolution Design

**Status:** Approved on 2026-07-11

## Goal

Make every gameplay trigger resolve into one immutable, compatibility-aware result before the UI displays or acknowledges it. The same result must supply the target, executor, count, effect, and completion state throughout the turn.

## Constraints

- Keep one local-only game model for every player count.
- Preserve current punishment density and takeoff-failure punishment.
- Do not add accounts, rooms, synchronization, fixed roles, or a separate two-player mode.
- Do not add a count-selection UI in this MR.
- Do not infer behavior from action descriptions.

## Chosen Architecture

Add a pure rule-resolution layer that receives the current player, player order, dice value, board cell or takeoff source, and punishment configuration. It returns a `ResolvedRuleResult` with no random work left for the UI to perform.

The result carries:

- source: takeoff failure, board punishment, dynamic board punishment, trap, rest, movement, restart, or bounce;
- actor, target, and executor indices when applicable;
- a fixed punishment action when its count is known;
- a structured pending external-count state for `other_player_choice`;
- a structured effect and explicit acknowledgement requirement for traps;
- an explicit turn consequence, including skipped turns for rest effects.

The App component remains the orchestrator: it displays the already-resolved result, records acknowledgement, applies the deterministic state transition, and advances the turn. It does not select a target, executor, compatible combination, or count.

## Dynamic Rule Semantics

| Dynamic rule | MR2 result |
| --- | --- |
| `dice_multiplier` | Fixed count equals dice value multiplied by the configured multiplier. |
| `previous_player` | Target resolves to the preceding player in circular order. |
| `next_player` | Target resolves to the following player in circular order. |
| `other_player_choice` | Target remains the triggering player; result is `awaiting_external_count` with the configured min, max, step and eligible chooser indices. No value is invented or randomized. |

For a single-player game, previous, next, and eligible-other lookups safely fall back to the current player or no executor as appropriate. This is a technical fallback, not a role model.

Existing confirmation means the people playing locally have completed the externally agreed action. MR3 will add explicit choice controls that attach a selected count to an `awaiting_external_count` result before completion.

## Compatibility and Action Resolution

Takeoff-failure punishment and generated board punishment use one compatibility-aware selector:

1. select an enabled tool by configured weight;
2. select only body parts with sufficient sensitivity for that tool;
3. select only positions compatible with the selected body part;
4. produce a valid stepped count when the source requires a fixed count.

Board actions confirmed during setup retain their exact action. Resolving a landing copies that action into the result rather than generating another action. This prevents the board, display, and acknowledgement stages from disagreeing.

## Effects and Turn Flow

- Traps resolve to a structured acknowledgement-required effect. Acknowledgement, not string parsing, advances the turn.
- Landing on rest increments the affected player's pending skipped-turn count. When that player next becomes active, one count is consumed and the turn advances without a dice roll.
- Movement, reverse, restart, and bounce retain their existing movement behavior but enter the UI through an explicit resolved effect.
- Existing chain guards remain in place and operate on resolved results.

## Alternatives Rejected

1. **Add optional fields to `PunishmentAction` and continue resolving in Vue.** This leaves target/count/executor decisions distributed across the UI and does not create a trustworthy boundary.
2. **Replace the entire game with event sourcing now.** This would improve long-term replayability but expands MR2 beyond a safe, testable rule-resolution slice.

## Testing

- Unit-test each resolver source and all dynamic-target player-count boundaries.
- Test that takeoff and board generation both reject incompatible body part and position combinations.
- Test fixed counts, pending external counts, trap acknowledgement, and rest-turn consumption.
- Add browser coverage for a resolved dynamic result and a consumed rest turn where practical.
- Run lint, type checking, unit tests, production build, and Playwright before MR publication.
