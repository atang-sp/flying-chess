# Reliability and Configuration Truth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the current local multiplayer game display and execute the configuration users actually selected, without changing punishment frequency or game content.

**Architecture:** Add small pure validators for board configuration, imported configuration, and movement-health state so the existing Vue component can delegate decisions instead of duplicating them. Use Playwright for browser-visible regressions and Vitest for state and validation behavior. Keep the existing GameService and App flow intact except at the repaired boundaries.

**Tech Stack:** Vue 3, TypeScript, Vitest, Playwright, Vite

---

## Constraints

- Preserve all player counts and the single shared game model.
- Preserve takeoff-failure punishment and current punishment density.
- Do not add cloud, accounts, rooms, or remote synchronization.
- Do not introduce the resolved-action model planned for MR 2.
- Each production behavior change requires a failing test first.

### Task 1: Add a Repeatable Browser Regression Harness

**Files:**
- Create: playwright.config.ts
- Create: tests/e2e/reliability.spec.ts
- Modify: package.json

**Step 1: Add the failing desktop-layout test**

Create a Playwright test that:

    test('desktop app fills the viewport width', async ({ page }) => {
      await page.goto('/flying-chess/')
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      const appWidth = await page.locator('.app').evaluate(element => element.getBoundingClientRect().width)
      expect(appWidth).toBeGreaterThanOrEqual(viewportWidth - 1)
    })

Configure a 1280 x 900 Chrome project and a Vite web server on 127.0.0.1:4175. Add a test:e2e script that runs tests/e2e.

**Step 2: Run the test and verify RED**

Run:

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run test:e2e -- --grep "desktop app fills"

Expected: FAIL because .app occupies only the first #app grid column.

**Step 3: Commit the failing regression harness**

    git add package.json playwright.config.ts tests/e2e/reliability.spec.ts
    git commit -m "test: add reliability browser regressions"

### Task 2: Fix the Desktop Root Layout

**Files:**
- Modify: src/assets/main.css
- Test: tests/e2e/reliability.spec.ts

**Step 1: Implement the minimal layout repair**

Remove the legacy two-column #app grid at the desktop breakpoint. Retain the existing max-width behavior only where a specific page owns that constraint; the root app must span the viewport.

**Step 2: Verify GREEN**

Run the desktop-layout Playwright test. Expected: PASS.

**Step 3: Run a mobile smoke check**

Run the same spec with a 390 x 844 project. Expected: PASS with no horizontal overflow.

**Step 4: Commit**

    git add src/assets/main.css tests/e2e/reliability.spec.ts
    git commit -m "fix: restore full-width desktop layout"

### Task 3: Make Board Size Authoritative

**Files:**
- Create: src/tests/boardConfig.test.ts
- Modify: src/services/gameService.ts
- Modify: src/components/BoardConfig.vue
- Modify: src/App.vue
- Test: tests/e2e/reliability.spec.ts

**Step 1: Write failing board validation tests**

Add tests proving:

    expect(GameService.validateBoardConfig({
      totalCells: 40,
      punishmentCells: 30,
      bonusCells: 1,
      reverseCells: 2,
      restCells: 1,
      restartCells: 4,
      trapCells: 2,
    })).toBe(false)

The assigned total is 40, but only 38 cells are available after reserving start and finish.

Add a test that createBoard rejects an invalid board configuration instead of silently dropping trailing cell types.

**Step 2: Verify RED**

Run:

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test -- src/tests/boardConfig.test.ts

Expected: validation returns true or board generation silently truncates.

**Step 3: Implement minimal service validation**

Change validateBoardConfig so assigned effects must be less than or equal to totalCells - 2. Require integer counts and totalCells between 20 and 100. Have createBoard throw a descriptive error for an invalid board configuration before random assignment.

**Step 4: Verify service tests GREEN**

Run the board-config unit tests. Expected: PASS.

**Step 5: Add a failing Playwright test for the input bug**

In the browser:

- enter 80 in the total-cell input;
- assert the displayed value is 80;
- assert window.gameState.boardConfig.totalCells is 80;
- assert window.gameState.board.length is 80.

Expected before the UI fix: FAIL with parent state and board length still 40.

**Step 6: Implement the minimal component fix**

Handle totalCells explicitly in BoardConfig. Emit valid total-cell changes to App. Do not auto-discard configured cell categories. When a local edit is invalid, keep it local, display invalid state, and leave the last valid generated board unchanged.

**Step 7: Verify unit and Playwright tests GREEN**

Run board-config unit tests and the total-cell Playwright test. Expected: PASS.

**Step 8: Commit**

    git add src/tests/boardConfig.test.ts src/services/gameService.ts src/components/BoardConfig.vue src/App.vue tests/e2e/reliability.spec.ts
    git commit -m "fix: keep board size and generated board in sync"

### Task 4: Make the Movement Watchdog Overlay-Aware

**Files:**
- Create: src/services/gameStateHealth.ts
- Create: src/tests/gameStateHealth.test.ts
- Modify: src/App.vue

**Step 1: Write failing health-decision tests**

Design a pure function:

    shouldRecoverMovingState({
      gameStatus: 'moving',
      movingDurationMs: 6000,
      hasBlockingOverlay: true,
    })

Assert it returns false when a takeoff punishment, trap, bounce, or takeoff-relief overlay is active, and true only when moving exceeds five seconds with no legitimate overlay.

**Step 2: Verify RED**

Run the new test file. Expected: module or function missing.

**Step 3: Implement the pure decision helper**

Keep time measurement in App, but delegate the reset decision to the helper. Treat all action-resolution overlays as legitimate blocking states.

**Step 4: Verify GREEN and full unit suite**

Run the new test and npm test. Expected: all tests pass.

**Step 5: Commit**

    git add src/services/gameStateHealth.ts src/tests/gameStateHealth.test.ts src/App.vue
    git commit -m "fix: preserve turns while game overlays are active"

### Task 5: Clear the Actual Local Game Data

**Files:**
- Modify: src/utils/cache.ts
- Create: src/tests/cache.test.ts
- Modify: src/components/IntroPage.vue

**Step 1: Write a failing storage test**

Use a small in-memory Storage test double. Seed:

- ludo_game_config
- ludo_player_settings
- flying-chess-config-backup
- hasShownGuide
- autoGuideEnabled

Call clearAllLocalGameData(storage) and assert every listed key is absent.

**Step 2: Verify RED**

Run the cache test. Expected: function missing.

**Step 3: Implement the single clearing API**

Export storage-key constants from cache.ts and add clearAllLocalGameData(storage = localStorage). Update IntroPage to call it rather than deleting stale literal keys. Keep the current refresh-based UI behavior; the dedicated end-of-game lifecycle remains MR 3.

**Step 4: Verify GREEN**

Run cache tests and the full unit suite. Expected: all tests pass.

**Step 5: Commit**

    git add src/utils/cache.ts src/tests/cache.test.ts src/components/IntroPage.vue
    git commit -m "fix: clear persisted local game data"

### Task 6: Reject Invalid Imports Before Persistence

**Files:**
- Create: src/utils/importValidation.ts
- Create: src/tests/importValidation.test.ts
- Modify: src/utils/export.ts

**Step 1: Write focused failing validation tests**

Cover these cases one at a time:

- effect counts exceed totalCells - 2;
- totalCells is outside 20 through 100;
- tools, body parts, positions, or traps are empty;
- intensity, sensitivity, ratio, strike range, step, or takeoff-failure values are outside supported ranges;
- a position names a body part that is not present;
- valid record-based current configuration passes;
- valid legacy array-based configuration passes.

Also test importFromJson with an invalid payload and assert existing local-storage values remain unchanged.

**Step 2: Verify RED**

Run the validation test file. Expected: malformed configuration is currently accepted.

**Step 3: Implement runtime validation**

Add pure validators that accept the current record representation and supported legacy array representation. Return path-specific error messages. Reuse board validation rules rather than duplicating the available-cell calculation.

Update validateImportData to validate every supplied configuration section before performImport can write storage.

**Step 4: Verify GREEN**

Run import-validation tests and the full unit suite. Expected: all pass.

**Step 5: Commit**

    git add src/utils/importValidation.ts src/tests/importValidation.test.ts src/utils/export.ts
    git commit -m "fix: validate imported game configuration"

### Task 7: Verify MR 1 as a Whole

**Files:**
- Modify only if a verification failure identifies an MR 1 regression.

**Step 1: Run formatting checks**

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run format:check

Expected: PASS.

**Step 2: Run lint and type checks**

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run lint:check
    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run type-check

Expected: zero errors. Existing unrelated warnings must not increase.

**Step 3: Run unit and browser suites**

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm test
    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run test:e2e

Expected: all tests pass.

**Step 4: Run production build**

    env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY -u http_proxy -u https_proxy -u all_proxy -u no_proxy npm run build

Expected: build succeeds. Record pre-existing bundle-size and Browserslist warnings separately.

**Step 5: Review scope**

Inspect:

    git diff --check origin/master...HEAD
    git diff --stat origin/master...HEAD
    git status --short

Confirm no punishment-density, player-count, online-service, or unrelated visual changes.

**Step 6: Request code review and publish MR 1**

Use superpowers:requesting-code-review, address any verified finding, then use github:yeet to push the branch and open a draft pull request.
