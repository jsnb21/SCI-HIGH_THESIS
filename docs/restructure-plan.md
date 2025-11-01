# Docs Folder Restructure Plan

This document proposes a clear, minimal-risk restructure for the repository `docs/` folder and explains what to change to keep GitHub Pages deployment working.

## Goals
- Make `docs/` easy to navigate and maintain.
- Keep public site layout and links stable after migration.
- Support GitHub Pages (site served from `docs/` on `main` branch) with minimal config changes.
- Make future updates predictable: where to add pages, assets, and developer docs.

## Current problems (observed)
- Many HTML pages and JS/CSS are at the `docs/` root, making it hard to find related assets.
- Multiple config/vite files in different places that may confuse the static deploy process.
- Some assets are in `docs/assets/` while others live elsewhere in repo — consolidation needed.
- Links and paths may be absolute or inconsistent and can break after moves.

## Constraints & deployment notes
- This repo uses GitHub Pages. Two common patterns:
  - Serve from `docs/` folder on `main` branch (recommended here).
  - Or build and deploy to `gh-pages` branch via GitHub Action.
- For static files already in `docs/`, using `docs/` as the Pages source is simplest.
- When using Vite during local dev, set `base` to a relative path (e.g. `./`) so built files work when served from `docs/` without extra host configuration.

## Proposed top-level `docs/` structure

- docs/
  - index.html                            # main landing page (keep at root)
  - site.webmanifest                      # site manifest (update paths to assets)
  - README.md                             # short instructions for site contributors (new)
  - pages/                                # HTML content pages (subpages)
    - admin/
      - index.html
    - developer/
      - index.html
    - news/
      - index.html
    - leaderboards/
      - index.html
    - professor-dashboard.html (or professor/...) # move into pages or keep special files at root if needed
  - assets/
    - css/
      - leaderboards.css
      - ...
    - js/
      - (site scripts used by HTML pages)
    - img/
    - audio/
    - sprites/
  - config/                               # site-specific JS config (config.js, firebaseClient.js)
  - docs-dev/ or dev/                      # developer-only notes, scripts, tooling (not part of public site)
  - archived/                             # old pages kept for reference (optional)

Notes:
- Keep `index.html` at `docs/index.html` — GitHub Pages will use this as the root.
- Move most other HTML pages into `docs/pages/` and update links. Use `pages/<section>/index.html` for directories to make pretty URLs work in various servers.
- Consolidate all static assets under `docs/assets/` and update paths in HTML and the `site.webmanifest`.

## Example mapping of existing files
(You should run an inventory pass — below are example moves based on what's currently present)
- `docs/admin.html` -> `docs/pages/admin/index.html` (or `docs/pages/admin.html` if you prefer flat files)
- `docs/developer.html` -> `docs/pages/developer/index.html`
- `docs/leaderboards.html` -> `docs/pages/leaderboards/index.html`
- `docs/assets/assets/css/leaderboards.css` -> remain at `docs/assets/css/leaderboards.css` (ensure references updated)
- `docs/config.js` and `docs/firebaseClient.js` -> `docs/config/` (or `docs/assets/assets/js/config/`), mark any secrets NOT to be committed

## Path and link update rules
- Prefer relative paths for assets in HTML pages: `./assets/css/leaderboards.css` or `../assets/css/...` depending on depth.
- In `site.webmanifest` use relative paths (`./assets/img/icon.png`) to avoid absolute path issues.
- If you use Vite, set `base: './'` in `vite.config.js` when building static site files to `docs/`.
- Search-and-replace patterns (PowerShell-friendly):
  - Replace absolute references like `/assets/` -> `./assets/` (careful: not all `/` should be changed).
  - Update `<link href="assets/css/` to `href="./assets/assets/css/` if moving.

## Migration step-by-step (safe, suggested)
1. Create a migration branch from `main`:
   - `git checkout -b docs/restructure` (PowerShell: `git checkout -b docs/restructure`)
2. Create the new folders inside `docs/`: `pages/`, `assets/{css,js,img,audio}`, `config/`, `docs-dev/`.
3. Draft `docs/restructure-plan.md` (this file) and `docs/README.md` with contributor instructions.
4. Move one or two pages as a test case (do not move everything at once):
   - Move `docs/leaderboards.html` -> `docs/pages/leaderboards/index.html`.
   - Update internal links in `index.html` to point to `pages/leaderboards/`.
5. Update `site.webmanifest` and any `<link>`/`<script>` tags to use new relative paths.
6. Run local checks: open `docs/index.html` in a browser (or run `npx serve docs` or preview via `vite`).
7. Fix any broken links discovered.
8. When test pages are stable, move other pages in small batches, repeating steps 4–7.
9. Commit regularly with clear messages: `git add -A && git commit -m "docs: move leaderboards into pages/ and update links"`.
10. When finished and verified, open a PR and ask maintainers to review.
11. Once merged, set GitHub Pages source in repo Settings to `main` branch / `docs/` folder (if not already set).

## PowerShell-friendly commands (examples)
- Create branch:
  git checkout -b docs/restructure

- Create folders:
  New-Item -ItemType Directory -Force -Path .\docs\pages, .\docs\assets\css, .\docs\assets\js, .\docs\assets\img, .\docs\config

- Move a file:
  Move-Item -Path .\docs\leaderboards.html -Destination .\docs\pages\leaderboards\index.html -Force

- Search and replace (PowerShell example using .NET regex):
  (Get-Content -Raw .\docs\index.html) -replace '/assets/','./assets/' | Set-Content .\docs\index.html

- Serve `docs/` locally quickly (if you have `serve` installed):
  npx serve .\docs

## QA checklist before merging
- [ ] All internal links resolve (use a link-checker like `linkinator` or `broken-link-checker`).
- [ ] `site.webmanifest` references valid asset paths.
- [ ] No secret or API keys committed in `docs/config/`.
- [ ] Run Lighthouse on main pages (performance, SEO, accessibility). Fix critical issues.
- [ ] Verify images/audio load and paths are correct.
- [ ] Verify relative paths work when opening `index.html` from file system and when served from GitHub Pages.

## Optional: GitHub Actions workflow (build & deploy)
If the site requires a build step (for example, running Vite to produce static output), consider using a GitHub Action that builds to `docs/` and commits the result or deploys to `gh-pages`. Example options:
- Build artifacts into `docs/` on push to `main` and keep Pages source `docs/`.
- Or build to `dist/` and push to `gh-pages` branch via `peaceiris/actions-gh-pages`.

I did not include a full Action here because the repo appears to already host static `docs/` content. If you want, I can produce a recommended `/.github/workflows/gh-pages.yml` tailored to your build pipeline.

## Rollback plan
- Keep the migration on its own branch until verified.
- If something breaks post-merge, revert the merge commit and apply fixes on the branch, or restore the previous layout from the branch history.

## Follow-ups / next steps I can take
- Inventory the current `docs/` files and produce a precise move map.
- Generate a small PowerShell script to automate safe moves + search/replace link updates.
- Create an example GitHub Action to build/deploy if you want a CI-based flow.

---

Note: This plan is intentionally conservative — it suggests moving content in small batches to keep the live site stable and to make review easy. If you prefer a faster bulk migration, I can provide a bulk move script and a set of automated link-fixes, but that increases risk and will need more thorough automated checking.

