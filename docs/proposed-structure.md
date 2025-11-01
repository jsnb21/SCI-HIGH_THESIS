# Proposed `docs/` Folder Structure

Generated: 2025-11-01

This file proposes a canonical layout for the `docs/` site to make it maintainable, predictable, and safe to deploy with GitHub Pages (serving directly from `docs/` on the `main` branch).

High-level goals
- Keep `docs/index.html` as the site's entry point.
- Group pages under `pages/` so URLs and file paths are organized (and pretty URLs can be used via `index.html` in directories).
- Consolidate static assets under `assets/` (css, js, img, audio, sprites, data).
- Keep configuration under `config/` and developer-only documentation under `dev/` (or `documentation/`).
- Keep large binary assets under `assets/` or `public/` and avoid duplication.

Recommended canonical structure (all paths under `docs/`):

- docs/
  - index.html                       # keep at root (site root)
  - 404.html
  - site.webmanifest
  - README.md                        # short contributor guide for editing site
  - pages/                           # main site pages (nice URLs)
    - admin/
      - index.html
    - developer/
      - index.html
    - news/
      - index.html
    - leaderboards/
      - index.html
    - professor/
      - index.html
    - game/
      - index.html                    # or keep a separate 'play' dir depending on routing
  - assets/                          # all public static assets
    - assets/css/
      - leaderboards.css
      - site.css
    - assets/js/
      - main.js
      - pages/                        # optionally mirror pages to keep page-specific scripts grouped
        - admin.js
        - news.js
        - leaderboards.js
    - img/
    - audio/
    - sprites/
    - data/                           # json data used by the site (questions.json, dialogue.json)
    - fonts/
  - config/                          # site configuration files
    - firebase-config.js
    - emailjs-config.js
    - firebase-database-rules.json
    - vite.config.js (if used by site build)
  - public/                          # large game assets / built artifacts (optional)
    - library/
    - assets/
  - documentation/ or dev/           # developer-facing docs not necessarily part of the public site
    - BloomQuestionAuthoring.md
    - AdaptiveReranking.md
    - howToStart.txt
  - tools/                           # small scripts like console log remover
    - remove-console-logs.ps1
    - remove-console-logs.cjs

Notes about choices
- Why `pages/`? Putting all pages inside `pages/<section>/index.html` makes URLs tidy (`/pages/news/` -> `/pages/news/index.html`) and avoids name collisions at root.
- Why `assets/`? Centralized assets avoid scattered copies and make it easier to run search-and-replace when paths change.
- Why `public/` vs `assets/`? Use `public/` for large generated build output you don't usually hand-edit, and `assets/` for authored assets referenced directly by pages.

File mapping (suggested moves for the main items discovered)
- `docs/index.html` -> keep at `docs/index.html` (no move)
- `docs/404.html` -> keep at `docs/404.html`
- `docs/admin.html` -> `docs/pages/admin/index.html`
- `docs/developer.html` -> `docs/pages/developer/index.html`
- `docs/news.html` -> `docs/pages/news/index.html`
- `docs/leaderboards.html` -> `docs/pages/leaderboards/index.html`
- `docs/game.html` -> `docs/pages/game/index.html` (or `docs/pages/play/index.html`)
- `docs/professor-dashboard.html` -> `docs/pages/professor/index.html` (rename for clarity)
- `docs/admin-password.txt` -> `docs/config/` or `tools/` (but storing passwords in repo is not recommended; ensure it's safe)

JavaScript and CSS
- `docs/assets/js/*` -> `docs/assets/js/` (or keep `docs/js/` but standardize)
- `docs/assets/assets/css/*` -> `docs/assets/css/` (already correct)
- Page-specific scripts (e.g., `js/pages/news/*`) can remain in `assets/js/pages/news/` to keep a page -> script mapping.

Large static assets
- `docs/public/assets/sprites/*` -> keep under `docs/assets/sprites/*` or keep as `docs/public/` if they are generated from a build pipeline. The important part is there is only one canonical copy.
- `docs/assets/data/*.json` -> `docs/assets/data/*.json` (if used by site pages). If they are game-only and large, `docs/assets/data/` is fine.

Source code vs built artifacts
- There are `src/` files in `docs/src/` and also a top-level `src/` in the repo root. Decide which is the authoritative source of truth:
  - If `docs/src/` are built artifacts (already compiled/minified), keep them in `docs/` as they are used by the site.
  - If `docs/src/` are original sources, move them to the repository root `src/` and change your build to output the site into `docs/` for GitHub Pages.

Naming conventions / rules
- Use kebab-case for filenames and folder names (e.g., `professor-dashboard` -> `professor-dashboard` or prefer `professor` for folder).
- Use `index.html` inside section folders so `.../news/` maps to `.../news/index.html`.
- Keep all asset references relative (recommended):
  - In HTML, use `./assets/css/site.css` or `../assets/css/...` depending on depth.
  - In `site.webmanifest` use `./assets/img/icon-192.png` to avoid absolute root path issues when served from a subpath.

Vite / build notes
- If you use Vite to build into the `docs/` folder, set `base: './'` in `vite.config.js` so the generated asset references are relative and work on GitHub Pages.
- If you do not run a build and commit static files directly to `docs/`, ensure links are relative.

Suggested small example mapping (explicit)
- docs/admin.html -> docs/pages/admin/index.html
- docs/developer.html -> docs/pages/developer/index.html
- docs/leaderboards.html -> docs/pages/leaderboards/index.html
- docs/news.html -> docs/pages/news/index.html
- docs/game.html -> docs/pages/game/index.html
- docs/professor-dashboard.html -> docs/pages/professor/index.html
- docs/assets/js/* -> docs/assets/js/*
- docs/public/assets/* -> docs/assets/* or docs/public/assets/* (pick one canonical location)
- docs/documentation/* -> docs/documentation/* (keep as-is or move to `dev/` if you want to separate public site docs)

Migration considerations (high level)
- Move files in small batches and test locally after each batch.
- Update relative links using targeted search-and-replace (PowerShell or Node script). Use a dry-run mode.
- Keep a migration branch during changes and open a PR for review.

Example contributor README (add as `docs/README.md`)
- Short instructions for maintainers: how to add a new page (create `docs/pages/<name>/index.html`), where to put images (`docs/assets/img/`), and how to run a local preview (e.g., `npx serve docs` or run Vite with `base: './'`).

Next steps I can take for you
1. Produce a per-file move map (every file in `docs/` -> target path) and a small PowerShell script to move files with a dry-run option.
2. Implement a small test migration: move `leaderboards.html` and related assets into the new structure on a branch and fix links.
3. Create `docs/README.md` and update `site.webmanifest` with example relative paths.

Which next step would you like me to perform now? If you want the per-file move map and script, I can generate them immediately and run a dry-run to show effects.
