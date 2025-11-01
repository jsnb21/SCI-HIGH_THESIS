# Docs Folder Inventory

Generated: 2025-11-01

This inventory lists the current contents of the `docs/` folder and groups files by purpose to help with the next migration step.

## Summary (high level)
- Top-level HTML pages: 9+ (index, 404, admin, developer, news, leaderboards, game, professor-dashboard, etc.)
- `assets/`: small set of site-level config + css
- `config/`: site/config JSON and JS
- `js/`: site scripts and per-page JS (31 files found)
- `src/`: game/source code and UI components (68 files found)
- `public/`: large set of static game assets (images, sprites, data) — 98 items found
- `documentation/`: dev docs and HOWTOs (5 files)
- `remove-logs/`: tooling to strip console logs (4 files)
- `package.json` + `package-lock.json`, `vite.config.js`, `vite.svg`


## Top-level HTML pages (docs root)
(Found in `docs/*.html`)
- index.html
- 404.html
- admin.html
- developer.html
- leaderboards.html
- news.html
- game.html
- professor-dashboard.html
- (admin-password.txt present too)

Notes: Several pages are currently at the repo root of `docs/`. Recommendation: keep `index.html` at `docs/`, move others under `docs/pages/<section>/index.html` for clarity.


## assets/
(Found in `docs/assets/`)
- assets/config.js
- assets/firebaseClient.js
- assets/css/leaderboards.css

Notes: Only a few files here; larger static assets are in `docs/public/`.


## config/
(Found in `docs/config/`)
- config/vite.config.js
- config/firebase-config.js
- config/firebase-database-rules.json
- config/emailjs-config.js

Notes: This is a good place for site-level config; ensure there are no secrets checked in.


## js/
(Found in `docs/js/` and subfolders; 31 files)
Representative files:
- js/main.js
- js/professor-dashboard.js
- js/notifications.js
- js/leaderboards/renderService.js
- js/leaderboards/firebaseClient.js
- js/pages/index/index-init.js
- js/pages/admin/main.js
- js/pages/news/pagination.js
- js/pages/news/visuals.js
- js/pages/developer/main.js

Notes: These are site scripts used by the HTML pages. Consider moving to `docs/assets/js/` or keep `docs/js/` but remove duplication.


## src/
(Found in `docs/src/` and subfolders; 68 files)
Representative files:
- src/main.js
- src/game.js
- src/gameManager.js
- src/audioUtils.js
- src/style.css
- src/components/* (PauseManager, TimerController, TutorialManager, etc.)
- src/services/* (authService, leaderboardService, aiRerankService, etc.)
- src/ui/* (LoginUI, VNDialogueBox, VirtualAssistant, etc.)

Notes: This appears to be the Phaser/game code shipped into `docs/` for the public playable demo. Keep under `docs/public/` or `docs/src/` depending on whether these are source or built assets. If these are unbuilt source files, consider moving to repository `src/` (already present in root of repo) and keep only built artifacts in `docs/`.


## public/
(Found in `docs/public/` and subfolders; 98 items)
Representative contents:
- public/vite.svg
- public/library/books.json
- assets/data/dialogue.json
- assets/data/questions.json
- public/assets/sprites/... (many NPCs, enemies, player, dungeon assets)
- public/assets/img/, public/assets/audio/ etc. (lots of binary assets)

Notes: This is the largest bucket of static assets (images, JSON data). Good candidate for `docs/assets/` consolidation or keep as `docs/public/` if it aligns with tooling.


## documentation/
(Found in `docs/documentation/`)
- BloomQuestionAuthoring.md
- AdaptiveReranking.md
- howToStart.txt
- CustomQuizScene-README.txt
- refactor-acceptance.md

Notes: Developer documentation — move to `docs/dev/` or keep `docs/documentation/` as a canonical docs area. These do not need to be part of the public site unless you want them discoverable.


## remove-logs/
- remove-console-logs.cjs
- remove-console-logs.ps1
- CONSOLE-LOG-CLEANER.md
- test.js

Notes: Tooling. Keep in repo and consider moving to `tools/` or `scripts/` for clarity.


## Config & Package files
- package.json (present)
- package-lock.json
- vite.config.js (root of docs)
- vite.svg
- site.webmanifest

Notes: Verify `vite.config.js` base setting if you build to `docs/`. If you serve `docs/` as static pages without a build step, make sure built asset paths are relative.


## Duplicate / suspicious items discovered
- `professor-dashboard.html` appears twice in the search results (possible duplicate path references). Please confirm if there are multiple copies or duplicates with similar names.
- Some `js/` and `src/` code exists both in root `src/` and in `docs/src/` — check whether `docs/src/` are built distributable assets or accidentally committed sources.


## Recommendations for next (short) actions
1. Confirm whether `docs/src/` files are the production-built game or source; if they are source, move to root `src/` and only include built outputs in `docs/`.
2. Consolidate large static assets under `docs/public/` or `docs/assets/` and update references.
3. Move non-root pages into `docs/pages/<section>/index.html` and update links.
4. Run an automated link-check after moves.


---

If you'd like, I can now produce a precise move-map (every file -> target folder) and a small PowerShell script to carry out safe batched moves (with a dry-run option). Which do you prefer next?

