# Path & Link Update Plan

Generated: 2025-11-01

Purpose
- After reorganizing `docs/`, update internal links and asset references so pages continue to work on GitHub Pages (served from `docs/`).
- Provide safe, reversible search-and-replace patterns and PowerShell commands to run locally with a dry-run option.

What needs updating (summary)
- HTML page links: e.g., `admin.html` -> `pages/admin/index.html` (we prefer `./pages/admin/` for linking to the directory).
- Script and stylesheet sources: `js/...` -> `assets/js/...` and (if applicable) `css/...` -> `assets/css/...`.
- Asset references in `site.webmanifest` and other JSON files — make them relative (e.g., `./assets/img/icon.png`).
- Any absolute root references starting with `/` — these break on GitHub Pages unless the repo is served at root. Prefer relative paths or `./` base.
- Vite config: set `base: './'` when building to `docs/` so generated asset paths are relative.

File types to search
- HTML: `*.html`
- JS: `*.js`
- CSS: `*.css`
- JSON & manifest: `*.json`, `*.webmanifest`
- Markdown / TXT: `*.md`, `*.txt` (docs or README files referencing site paths)

Planned replacements (patterns + examples)

1) Top-level HTML pages -> pages/<basename>/
- Pattern: occurrences of `\b<BASENAME>\.html\b`
- Replacement: `pages/<basename>/`
- Example: `href="admin.html"` -> `href="./pages/admin/"`

Notes: Keep a trailing slash to point at the directory (which serves `index.html`). If you prefer explicit files, use `./pages/admin/index.html`.

2) Move `js/` -> `assets/js/` but only in attribute values
- Pattern (attribute-aware): `(src|href)\s*=\s*["']([^"']*?)\bjs/`
- Replacement: preserve prefix and replace `assets/js/` with `assets/js/`
- Example: `<script src="assets/js/main.js">` -> `<script src="./assets/assets/js/main.js">`

3) Move `css/` -> `assets/css/` (similar approach)
- Pattern (attribute-aware): `(href)\s*=\s*["']([^"']*?)\bcss/`
- Replacement: `assets/assets/css/`
- Example: `<link href="assets/assets/css/leaderboards.css">` (no change) vs `<link href="assets/css/site.css">` -> `<link href="./assets/assets/css/site.css">`

4) Public data / images
- If `public/` assets are moved under `assets/`, update `public/` references accordingly.
- Example: `public/assets/sprites/...` -> `assets/sprites/...`

5) site.webmanifest
- Ensure icons and start_url are relative (use `./assets/...`). Manifests using absolute paths like `/assets/...` should be changed to `./assets/...`.

6) Remove leading slashes where appropriate
- Replace `href="./assets/` -> `href="./assets/` (careful: only do this for site-local references). Avoid touching external URLs (e.g., `https://...`).

Search & replace tools
- PowerShell script provided: `docs/tools/fix-paths.ps1` (dry-run default; apply with `-Apply`).
- Node-based options (if preferred): use `replace-in-files` or write a small Node script using `glob` + `replace-in-file`.

Safety: Backups & dry-run
- The provided PowerShell script does a backup copy of each file it will modify into `docs/migration-backup-<timestamp>/` when running with `-Apply`.
- Default behavior is a dry-run which prints proposed replacements and sample contexts.

Testing & verification steps
1. Run the script in dry-run and review the reported replacements.
2. If ok, run the script with `-Apply` on a feature branch (not `main`).
3. Serve the `docs/` folder locally to validate pages:

```powershell
# quick static server (requires `npx http-server` or `npx serve`) - example using http-server
npx http-server .\docs -p 8080
# or
npx serve .\docs
```

4. Run a link checker (npm tools):

```powershell
npm install -g linkinator
linkinator http://localhost:8080 --skip ./node_modules
```

or run `npx broken-link-checker`.

5. Run Lighthouse in Chrome DevTools on key pages (index, leaderboards, news) and fix critical issues.

Vite note
- If you use Vite to build static assets into `docs/`, set `base: './'` in `vite.config.js` to generate relative asset paths.

Example PowerShell search (one-liners) — DRY-RUN style
- Find files referencing `admin.html`:

```powershell
Get-ChildItem -Path .\docs -Recurse -Include *.html,*.js,*.css -File | Select-String -Pattern '\badmin\.html\b' | ForEach-Object { $_.Path ; $_.Line }
```

- Find files referencing `/assets/`:

```powershell
Get-ChildItem -Path .\docs -Recurse -Include *.html,*.js,*.css,*.json -File | Select-String -Pattern '/assets/' | ForEach-Object { $_.Path ; $_.Line }
```

If you'd like, I can run the Dry-run for you now and show the top N proposed replacements. This won't change any files. Would you like me to execute the dry-run and show results, or proceed straight to generating the replacements script only? 

