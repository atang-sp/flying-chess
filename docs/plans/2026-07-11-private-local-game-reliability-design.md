# Private Local Game Reliability Design

**Status:** Approved on 2026-07-11

## Context

Flying Chess is a private, local-only punishment game. It supports any player count, although two players are the most common case. The product must not split into separate two-player and multiplayer modes, and it must not encode fixed dominant/submissive roles. The same local game model and rules apply to every supported player count.

Punishment is the core reward-and-risk loop. Failing to take off and landing on punishment cells are intentional sources of tension, so this work must not lower punishment density or remove takeoff-failure punishment. The problem to solve is whether the configured rule is resolved consistently, displayed truthfully, and kept private on the device.

## Product Principles

1. **One game model for all player counts.** Two players require no special mode or separate data model.
2. **Local only.** No accounts, cloud storage, remote rooms, or online synchronization are introduced.
3. **Punishment remains central.** Existing takeoff-failure punishment and default punishment density remain intact unless separately redesigned later.
4. **Configuration is authoritative.** Every rule path must honor configured compatibility and limits.
5. **Private by default.** Names, preferences, and current-game data stay on the device and can be cleared reliably at the end of play.
6. **Results are deterministic after resolution.** Once a dice result is resolved, target, executor, count, source rule, and follow-up state cannot disagree across UI and engine code.

## Architecture

### Configuration and Reliability Boundary

User-visible configuration must match the state used to generate the board. Validation will enforce cross-field constraints, including reserving start and finish cells. Imported data will be validated by the same runtime contract before it can replace stored configuration.

UI health recovery must understand legitimate long-running game overlays. Waiting while players carry out an action is not a stuck movement state.

### Rule Resolution Boundary

A later MR will introduce a pure rule-resolution layer. Dice movement, takeoff failure, punishment cells, dynamic cells, traps, rest, bounce, and victory rewards will produce explicit resolved results before the UI displays them. The UI will render resolved state and emit player decisions; it will not infer target or count from descriptive strings.

All punishment sources will use the same compatibility filter. Takeoff failure remains a punishment event, but it can no longer bypass the compatibility guarantees used by board combinations.

### Local Game Data Lifetime

Long-lived global defaults and current-game data will be separated conceptually while remaining browser-local. A current game may contain player names, optional per-player restrictions, board state, and resolution history. Ending and clearing a game removes current-game data and backup artifacts without requiring a server.

Per-player restrictions are optional. A player inherits the global configuration when none are supplied, so existing multiplayer setup continues to work.

### Interaction Model

Resolved actions will support explicit decisions such as complete, use a preconfigured alternative, skip, or pause. These decisions are game state, not hidden UI shortcuts. Victory rewards become configurable rules processed through the same resolver instead of hard-coded component text.

## Merge Request Sequence

### MR 1: Reliability and Configuration Truth

- Fix the desktop two-column root layout.
- Make total-cell changes update parent state and regenerate the actual board.
- Validate assigned cells against `totalCells - 2` and avoid silent truncation.
- Prevent legitimate action, trap, bounce, and relief overlays from triggering the movement watchdog.
- Clear the real local-storage keys and backup artifact.
- Validate imported board, punishment, position, and trap data before persistence.
- Add unit and Playwright regressions for each repaired behavior.

This MR must not change punishment density, takeoff-failure punishment, player-count behavior, or introduce new gameplay.

### MR 2: Trustworthy Rule Resolution

- Add an immutable resolved-action contract.
- Route takeoff failure and board punishment through one compatibility-aware generator.
- Implement dynamic target and count rules as actual engine behavior.
- Implement rest as a consumed skipped turn.
- Represent traps as structured effects with a truthful completion state.
- Remove description parsing as a source of rule behavior.
- Add unit tests for every rule source and multiplayer target edge case.

### MR 3: Private Local Game Lifecycle

- Keep a single multiplayer-capable game model.
- Add optional per-player restrictions that inherit global defaults.
- Add explicit complete, alternative, skip, and pause decisions.
- Make victory rewards configurable and resolver-driven.
- Separate persistent defaults from current-game data.
- Add a reliable local “end and clear” action with no network dependency.

### MR 4: Accessibility, Reproducibility, and Release Gates

- Replace click-only dice and board cells with semantic keyboard-accessible controls.
- Add focus management and announcements for game dialogs and turn changes.
- Restore browser zoom and fix small-screen control overlap.
- Generate boards from a real seed and restore the exact exported board.
- Run Playwright tests in CI across desktop and mobile viewports.
- Align README, schema examples, and deployment documentation with actual behavior.

## Error Handling

- Reject invalid imported data before writing any storage key.
- Preserve the previous valid configuration when import validation fails.
- Do not reset turn state while an intentional overlay is active.
- Surface recoverable configuration errors in the UI instead of silently truncating or regenerating different rules.

## Testing Strategy

- Use test-driven development for every behavior change.
- Unit-test pure validation and rule resolution.
- Component-test state transitions that cross Vue components.
- Use Playwright for configuration truth, desktop layout, keyboard dice access, local-data clearing, and the complete configuration-to-game path.
- Require lint, type-check, unit tests, production build, and Playwright tests before merging each MR.

## Non-Goals

- No cloud service, account system, online room, remote synchronization, or analytics backend.
- No dedicated two-player mode.
- No fixed dominant/submissive role model.
- No reduction of punishment frequency as part of reliability work.
- No visual redesign beyond changes required for correctness and accessibility.
