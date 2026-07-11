# Trustworthy Rule Resolution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve every takeoff and board rule into an immutable, compatibility-aware result before the Vue UI presents or acknowledges it, while deliberately deferring external count-selection controls to MR3.

**Architecture:** Add a pure `ruleResolution` domain module and discriminated result types. `GameService` will use the module's shared compatible-action factory for both generated board punishments and takeoff failures; `App.vue` will retain presentation and acknowledgement responsibility, but consume already-resolved target/count/effect data rather than deciding gameplay rules. Rest effects will persist a pending skipped-turn counter on the player and the turn-advance path will consume it deterministically.

**Tech Stack:** Vue 3, TypeScript, Vitest, Playwright

---

### Task 1: Define the resolved-rule domain contract

**Files:**
- Modify: `src/types/game.ts:1-123`
- Create: `src/services/ruleResolution.ts`
- Create: `src/tests/ruleResolution.test.ts`

**Step 1: Write the failing test**

Add tests that import a not-yet-created `resolveRule` and assert that a board punishment keeps its configured tool/body-part/position/count exactly, rather than generating a new action.

```ts
expect(resolveRule({ source: 'board_punishment', actorIndex: 1, players, boardAction }))
  .toMatchObject({
    kind: 'punishment',
    source: 'board_punishment',
    actorIndex: 1,
    targetPlayerIndex: 1,
    count: { kind: 'fixed', value: 10 },
  })
```

**Step 2: Run the test to verify it fails**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts`

Expected: FAIL because `ruleResolution.ts` and its exported contract do not exist.

**Step 3: Write minimal implementation**

In `src/types/game.ts`, add explicit, discriminated types:

```ts
export type RuleResolutionSource =
  | 'takeoff_failure'
  | 'board_punishment'
  | 'trap'
  | 'cell_effect'

export type ResolvedPunishmentCount =
  | { kind: 'fixed'; value: number }
  | {
      kind: 'awaiting_external_count'
      minimum: number
      maximum: number
      step: number
      eligibleChooserIndices: number[]
    }

export interface ResolvedPunishmentResult {
  kind: 'punishment'
  source: 'takeoff_failure' | 'board_punishment'
  actorIndex: number
  targetPlayerIndex: number
  executorIndex?: number
  action: PunishmentAction
  count: ResolvedPunishmentCount
}
```

Include a structured acknowledgement-required trap result and a cell-effect result carrying its explicit `turnConsequence`. In `src/services/ruleResolution.ts`, implement the smallest pure resolver that copies a static board action into `ResolvedPunishmentResult`; use `Readonly` inputs and return a newly-built result without mutating players, board cells, or the action.

**Step 4: Run the test to verify it passes**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/game.ts src/services/ruleResolution.ts src/tests/ruleResolution.test.ts
git commit -m "feat: add resolved rule domain contract"
```

### Task 2: Build and prove the shared compatible punishment selector

**Files:**
- Modify: `src/services/ruleResolution.ts`
- Modify: `src/services/gameService.ts:53-105`
- Modify: `src/services/gameService.ts:474-570`
- Modify: `src/tests/takeoffLogic.test.ts`
- Modify: `src/tests/ruleResolution.test.ts`

**Step 1: Write the failing tests**

Add a deterministic config containing a high-ratio incompatible body part and position plus a single valid combination. Assert that the generated action never uses the incompatible candidates and that its count is in the configured range and is divisible by the configured step.

```ts
const action = createCompatiblePunishmentAction(config, {
  randomInt: () => 1,
  pickWeighted: entries => entries[0],
})

expect(action.tool.name).toBe('皮拍')
expect(action.bodyPart.name).toBe('臀部')
expect(action.position.name).toBe('俯卧')
expect(action.strikes).toBe(10)
```

Add a takeoff-failure regression test using the same config and assert `GameService.movePlayer(...).punishment` is compatible. Add a board-generation assertion that every punishment cell has a compatible body part/position and a stepped count.

**Step 2: Run the tests to verify they fail**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts src/tests/takeoffLogic.test.ts`

Expected: FAIL because board creation and takeoff failure still select each field independently.

**Step 3: Write minimal implementation**

Add `createCompatiblePunishmentAction(config, randomSource?)` to `ruleResolution.ts`. Its algorithm must:

1. choose a weighted enabled tool;
2. keep only body parts whose `sensitivity >= tool.intensity` (fall back to all enabled parts only when no compatible part exists, preserving a usable old configuration);
3. choose only positions whose `compatibleBodyParts` is empty or contains the selected body part;
4. calculate the legal stepped count using `ceil(min / step)` through `floor(max / step)`.

Inject a tiny random-source interface only for the pure factory's tests; production defaults to the existing secure random helpers. Replace both independent-selection blocks in `GameService.createBoardRandom` and the takeoff-failure branch of `GameService.movePlayer` with this factory. Do not change the confirmed-board-action path.

**Step 4: Run tests to verify they pass**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts src/tests/takeoffLogic.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/ruleResolution.ts src/services/gameService.ts src/tests/ruleResolution.test.ts src/tests/takeoffLogic.test.ts
git commit -m "fix: resolve only compatible punishments"
```

### Task 3: Resolve dynamic targets and counts without inventing a player choice

**Files:**
- Modify: `src/services/ruleResolution.ts`
- Modify: `src/tests/ruleResolution.test.ts`

**Step 1: Write the failing tests**

Add a parameterized target-resolution suite for one, two, and three players. Include circular previous/next behavior, a dice multiplier fixed count, and an `other_player_choice` result that remains pending:

```ts
expect(resolveRule({
  source: 'board_punishment',
  actorIndex: 1,
  players: threePlayers,
  diceValue: 4,
  boardAction: { ...action, dynamicType: 'other_player_choice' },
})).toMatchObject({
  targetPlayerIndex: 1,
  count: {
    kind: 'awaiting_external_count',
    minimum: 5,
    maximum: 15,
    step: 5,
    eligibleChooserIndices: [0, 2],
  },
})
```

Assert that the action's original `strikes` is not used as a random/default choice for an external-count rule.

**Step 2: Run the tests to verify they fail**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts`

Expected: FAIL because only static actions are currently resolved.

**Step 3: Write minimal implementation**

Extend `resolveRule` to resolve `dynamicType` using data, not descriptions:

```ts
const previousIndex = actorIndex === 0 ? players.length - 1 : actorIndex - 1
const nextIndex = (actorIndex + 1) % players.length
```

- `dice_multiplier`: retain the triggering player as target and return `{ kind: 'fixed', value: diceValue * multiplier }`.
- `previous_player` / `next_player`: resolve circular target index, with the sole player as the safe fallback.
- `other_player_choice`: retain the actor as target, return `awaiting_external_count`, and calculate eligible choosers as every non-actor index. Leave `executorIndex` absent when no eligible chooser exists.

Keep returned actions copied and immutable. Do not add any UI or automatic choice fallback.

**Step 4: Run the tests to verify they pass**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/ruleResolution.ts src/tests/ruleResolution.test.ts
git commit -m "feat: resolve dynamic punishment rules"
```

### Task 4: Model structured traps and rest-turn consumption

**Files:**
- Modify: `src/types/game.ts:1-123`
- Modify: `src/services/ruleResolution.ts`
- Modify: `src/tests/ruleResolution.test.ts`
- Modify: `src/tests/bounceChainLogic.test.ts`

**Step 1: Write the failing tests**

Test a trap input returns a dedicated structured result with `acknowledgementRequired: true`. Test a rest cell result has `turnConsequence: { kind: 'skip_next_turns', count: 1 }`. Test that applying the consequence increments a player's counter and that consuming the start of their next turn decrements it and reports a skipped turn.

```ts
const rested = applyTurnConsequence(player, { kind: 'skip_next_turns', count: 1 })
expect(rested.pendingSkippedTurns).toBe(1)
expect(consumePendingSkippedTurn(rested)).toEqual({ shouldSkip: true, player: { ...rested, pendingSkippedTurns: 0 } })
```

**Step 2: Run the tests to verify they fail**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts src/tests/bounceChainLogic.test.ts`

Expected: FAIL because traps/rest are only description-driven and players have no skipped-turn state.

**Step 3: Write minimal implementation**

Add optional `pendingSkippedTurns?: number` to `Player`. Implement pure `resolveRule` branches for `trap` and ordinary cell effects, plus pure immutable helpers:

```ts
export const applyTurnConsequence = (player: Player, consequence: TurnConsequence): Player =>
  consequence.kind === 'skip_next_turns'
    ? { ...player, pendingSkippedTurns: (player.pendingSkippedTurns ?? 0) + consequence.count }
    : player
```

`consumePendingSkippedTurn` must never make the counter negative and must leave a player with zero / missing counter able to roll. Do not change movement and bounce calculation rules in this task.

**Step 4: Run the tests to verify they pass**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts src/tests/bounceChainLogic.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/types/game.ts src/services/ruleResolution.ts src/tests/ruleResolution.test.ts src/tests/bounceChainLogic.test.ts
git commit -m "feat: model trap acknowledgement and rest turns"
```

### Task 5: Adapt the Vue turn flow to resolved results

**Files:**
- Modify: `src/App.vue:1-1320`
- Modify: `src/types/game.ts:94-123`
- Modify: `tests/e2e/reliability.spec.ts`

**Step 1: Write the failing browser checks**

Add Playwright tests that use the existing development-only debug state to prove:

1. a landing punishment with `other_player_choice` displays the existing punishment acknowledgement flow without synthesizing a strike count; and
2. after an acknowledged rest result, the affected player's next active turn is automatically skipped and the following player becomes current without exposing a dice-roll state for the skipped player.

Use text/visible modal assertions only; do not add a new count selector or rely on implementation-only globals beyond the existing test hook.

**Step 2: Run the browser checks to verify they fail**

Run: `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npx playwright test --project=chromium tests/e2e/reliability.spec.ts`

Expected: FAIL because Vue still creates executor/target behavior across distributed handlers and rest only changes description text.

**Step 3: Write minimal implementation**

Add one `pendingResolution` field to `GameState` (or an equivalent single reactive reference typed as `ResolvedRuleResult | null`). In `moveCurrentPlayer` and `handleLandingCellEffect`, call `resolveRule` once and map the returned result to the existing display components:

- populate punishment display from `result.action`, `result.targetPlayerIndex`, `result.executorIndex`, and `result.count`;
- preserve the existing confirmation as the offline acknowledgement for fixed and external pending counts;
- route trap confirmation from its structured acknowledgement requirement;
- when rest is acknowledged, replace the player object with `applyTurnConsequence`'s result;
- before a normal roll, use `consumePendingSkippedTurn`. When it returns `shouldSkip`, update the player, show a short neutral status message, and call the normal turn advance without rolling.

Do not create an external-count selection UI, do not parse descriptions, and do not modify the game/player-count setup model.

**Step 4: Run focused checks to verify they pass**

Run:

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/ruleResolution.test.ts src/tests/takeoffLogic.test.ts src/tests/bounceChainLogic.test.ts
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npx playwright test --project=chromium tests/e2e/reliability.spec.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.vue src/types/game.ts tests/e2e/reliability.spec.ts
git commit -m "feat: drive turns from resolved rules"
```

### Task 6: Verify the MR2 slice and prepare review evidence

**Files:**
- Modify only if a verification-driven correction is necessary: relevant source and test files above

**Step 1: Run static and unit validation**

Run:

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run type-check
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run lint
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test
```

Expected: type check and all unit tests pass; lint has no new errors (record pre-existing warnings separately if present).

**Step 2: Build and run browser validation**

Run:

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run build
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npx playwright test
```

Expected: production build succeeds and all desktop-enabled Playwright scenarios pass (mobile projects may retain their intentional skips).

**Step 3: Inspect the final diff**

Run:

```bash
git status --short
git diff master...HEAD --check
git log --oneline master..HEAD
```

Expected: clean worktree, no whitespace errors, and focused commits only.

**Step 4: Commit only a necessary verification correction**

```bash
git add <affected-files>
git commit -m "fix: correct rule resolution edge case"
```

Do not make unrelated cleanup commits.
