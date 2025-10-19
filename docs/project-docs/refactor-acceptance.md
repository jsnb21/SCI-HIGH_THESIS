# MainGameplay Refactor: Acceptance Criteria and Verification

This document defines the behavioral contract and checks to preserve while refactoring `docs/src/scenes/roguelikeBase/main_gameplay.js`.

## Acceptance Criteria

1) Timer correctness
- Ticks exactly once per second during active play.
- Pauses during countdown, quiz, power-up popup, and any frozen/paused state.
- Never duplicates (at most one repeating timer event exists).
- addTime caps at 60; goblin thug penalty subtracts exactly the configured value.
- On reaching 0, triggers a single time-up flow (overlay → results).

2) Streak and power-ups hygiene
- Streak resets on result screen entry and on scene shutdown.
- Power-up state resets on result screen entry and on scene shutdown.
- No power-up effects carry into a new session unexpectedly.

3) DOM HUD behavior
- HUD appears once, aligned to the game canvas, and updates score/streak/timer consistently.
- No lingering HUD after leaving the scene; listeners are removed.
- Responsive sizes and positions remain consistent on resize.

4) Enemies and thugs
- Spawning and indicators function as before.
- Thug collision applies time penalty, effects, and visuals exactly once.
- Clearing spawn indicators/thugs between waves is reliable.

5) Lifecycle and cleanup
- All timers, tweens, delayed calls, and event listeners are stopped/removed on shutdown.
- No console errors or memory leaks due to stale references.

6) No behavior regressions
- Score, intensity progression, and quiz integration produce the same outcomes.
- Visual polish (flashes, shakes, overlays) appears as before.

## Phase-by-Phase Verification Checklist

For each phase (HUD, Timer, Power-ups, Enemies/Thugs, Quiz, Player/Background, State Machine):

- Build and run smoke test:
  - Start a game, answer a question correctly and incorrectly, collect time icon, collide with a thug, trigger time-up.
  - Resize the window (desktop and mobile sizes) and observe HUD alignment.
  - Transition to results and back to a new game; confirm resets.
- Logs (with DEBUG enabled):
  - One-time init logs per module.
  - Timer start/stop/tick; onExpired fired once.
  - Quiz start/completion payload.
  - Power-up grant/reset events.
- Quality gates:
  - Lint/typecheck passes.
  - No uncaught exceptions in console during the flow.

## How to enable DEBUG logs

- In dev tools console before loading the scene: `localStorage.setItem('DEBUG', '1')` and refresh.
- Or set `window.__DEBUG__ = true` in a boot script.

## Rollback plan

- Each extraction should be committed independently.
- If a regression is detected, rollback the last module extraction and fix forward.