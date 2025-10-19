# SCI-HIGH_THESIS Restructure Plan (in-place under `docs/`)

This plan restructures files inside `docs/` while keeping:

- `docs/index.html` unchanged
- `docs/src/game.js` unchanged

It consolidates "source" under `docs/src` and static assets under `docs/public`. It also organizes feature and page scripts into logical folders. The changes are staged and reversible via PR.

## Overview

- Unify all JavaScript sources under `docs/src/**`
- Group page-specific scripts under `docs/src/pages/**`
- Group Leaderboards feature under `docs/src/features/leaderboards/**`
- Consolidate ad-hoc assets/configs misplaced under `docs/assets` and `docs/config`
- Move maintenance tools and docs to dedicated folders under `docs/tools/**` and `docs/project-docs/**`
- Do NOT move or edit `docs/index.html` and `docs/src/game.js`

Use the provided scripts for a safe, incremental rollout:

1) Dry-run the move script to preview changes
2) Apply moves in stages (group filters)
3) Dry-run the import updater to preview reference changes in JS/HTML
4) Apply import updates

## Target structure

```
docs/
  index.html                 (unchanged)
  game.html                  (unchanged path)
  admin.html                 (unchanged path)
  developer.html             (unchanged path)
  leaderboards.html          (unchanged path)
  news.html                  (unchanged path)
  professor-dashboard.html   (unchanged path)

  public/                    (static assets served by URL)
    assets/
      ...
    data/
      ...
    library/
      ...

  src/                       (all application code)
    game.js                  (unchanged)
    main.js                  (moved from docs/js/main.js)
    assets/                  (assets imported via JS/ESM)
    core/
      audioUtils.js
      graphicsUtils.js
      gameManager.js
      save.js
    components/
      PauseManager.js
      TimerController.js
      TutorialConfig.js
      TutorialManager.js
      buttons/
    scenes/
      ... (existing scene structure retained)
    services/
      authService.js
      leaderboardService.js
      masteryService.js
      careerStatsService.js
      customQuizService.js
      aiRerankService.js
      (optional) firebase/
        firebaseClient.js    (if you centralize later)
    features/
      leaderboards/
        data/
          cache.js
          dataService.js
        ui/
          aos-init.js
          chartsService.js
          renderService.js
        utils/
          config.js
          countdownSnapshot.js
          (temporary) firebaseClient.js (kept local for now)
    pages/
      admin/
        main.js
      developer/
        main.js
        tailwind-config.js   (browser-run per requirement)
      index/
        index-init.js
        visuals.js
        notifications-fallback.js
        modals.js
        news.js
        dev.js
        aos-init.js
        authManager.js
        assistant.js
        maintenanceToast.js
        notifications.js
      news/
        visuals.js
        pagination.js
        tailwind-config.js   (browser-run per requirement)
    ui/
      ... (existing UI files)
    utils/
      ... (existing utils files)
    styles/ (optional)

  tools/
    maintenance/
      remove-console-logs.cjs
      remove-console-logs.ps1
      CONSOLE-LOG-CLEANER.md
      test.js
    firebase/
      rules/
        firebase-database-rules.json
        firebase-rules-secure.json
        oldfirebaserules.json
    restructure/
      move-plan.md           (this file)
      move-map.json          (machine-readable mapping)
      run-moves.ps1          (PowerShell mover)
      update-imports.cjs     (Node.js updater)

  project-docs/
    AdaptiveReranking.md
    BloomQuestionAuthoring.md
    CustomQuizScene-README.txt
    howToStart.txt
    refactor-acceptance.md

  config/
    (keep only build-time configs if absolutely needed; duplicate vite.config.js should be removed later)
```

## Stages

- Stage A: Move leaderboards feature from `docs/js/leaderboards/**` → `docs/src/features/leaderboards/**`
- Stage B: Move page scripts from `docs/js/pages/**` → `docs/src/pages/**`
- Stage C: Move root `docs/js/*.js` → appropriate `docs/src/**` locations
- Stage D: Move maintenance tools and documentation
- Stage E: Move selected configs; keep rules under tools

Each mapping is encoded in `move-map.json` with a `group` tag (leaderboards, pages-admin, pages-developer, pages-index, pages-news, js-root, remove-logs, documentation, config-to-src, rules-to-tools, assets-to-src).

## How to run (Windows PowerShell)

1) Preview moves (dry run):

```powershell
pwsh -File .\docs\tools\restructure\run-moves.ps1 -DryRun
```

2) Apply a specific stage (e.g., leaderboards):

```powershell
pwsh -File .\docs\tools\restructure\run-moves.ps1 -Group leaderboards
```

3) Update imports and HTML references (dry run):

```powershell
node .\docs\tools\restructure\update-imports.cjs --dry-run
```

4) Apply import updates:

```powershell
node .\docs\tools\restructure\update-imports.cjs
```

5) Commit after each stage to keep the PR incremental.

## Notes

- The import updater performs safe, conservative path fragment rewrites in JS and HTML for well-known directory changes. Complex relative import rewrites are intentionally avoided in v1; the script will report unresolved imports for manual follow-up if any remain.
- Tailwind config files remain client-side for pages that need them in-browser (as requested).
- Duplicate `vite.config.js` files should be consolidated to a single `docs/vite.config.js` in a subsequent step.
