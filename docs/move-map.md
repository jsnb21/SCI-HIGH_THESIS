# Docs Move Map

Generated: 2025-11-01

Purpose
- This document records the planned file moves for `docs/` to match the proposed canonical structure. Use it to review before running the migration script `docs/tools/migrate-docs.ps1`.

Summary of rules
- Keep `docs/index.html` and `docs/404.html` at the docs root.
- Move every other HTML file at `docs/` root into `docs/pages/<basename>/index.html` (for pretty URLs).
- Move `docs/js/` -> `docs/assets/js/` (page and global scripts).
- Keep `docs/assets/` (and subfolders like css) where they are; consolidate into `docs/assets/*` when needed.
- Move `docs/src/` -> `docs/public/src/` (keep game source under `public` to indicate built/distributable files).
- Keep `docs/public/` as-is (already large built assets); create `docs/public/src/` if needed.
- Move `docs/remove-logs/` -> `docs/tools/`.
- Move `docs/admin-password.txt` -> `docs/config/admin-password.txt` (manual review recommended; storing passwords in repo is discouraged).

Planned explicit mapping for top-level files (examples)
- docs/index.html
  - keep at docs/index.html
- docs/404.html
  - keep at docs/404.html
- docs/admin.html -> docs/pages/admin/index.html
- docs/developer.html -> docs/pages/developer/index.html
- docs/news.html -> docs/pages/news/index.html
- docs/leaderboards.html -> docs/pages/leaderboards/index.html
- docs/game.html -> docs/pages/game/index.html
- docs/professor-dashboard.html -> docs/pages/professor/index.html (rename folder to `professor`)
- docs/admin-password.txt -> docs/config/admin-password.txt

Directory moves (pattern)
- docs/js/* -> docs/assets/js/*
- docs/src/* -> docs/public/src/*
- docs/remove-logs/* -> docs/tools/*
- docs/documentation/* -> docs/documentation/* (keep as-is)
- docs/config/* -> docs/config/* (keep as-is)
- docs/public/* -> docs/public/* (keep as-is)

Notes & manual checks required
- After moves, search and update HTML, JS and manifest references to assets (paths will need to be adjusted to `./assets/...` or `../assets/...` depending on depth).
- Verify `site.webmanifest` paths are relative and correct.
- Double-check `docs/src/`: if these are source files you still edit, consider moving them to the repo root `src/` and running a build that outputs to `docs/` instead.
- The script performs a backup copy of each moved file to `docs/migration-backup-<timestamp>/` before moving; still review the backup before deleting.

If you want, I can expand this into a fully explicit per-file listing (every file path enumerated). The migration script below uses the rules above and will handle existing files automatically.
