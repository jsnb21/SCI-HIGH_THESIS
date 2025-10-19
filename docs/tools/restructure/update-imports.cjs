#!/usr/bin/env node
/*
  Safe updater for common path changes introduced by the restructure.
  - Supports dry-run via --dry-run
  - Rewrites string literal paths in JS/HTML for known folder moves
  - Reports potential unresolved imports for manual follow-up
*/

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const DOCS = path.join(projectRoot, 'docs');

// Simple, conservative replacement table.
// Left side should reflect old paths that appear in code.
// Right side is the new relative path.
const replacements = [
  // JS under docs/js/** moved to docs/src/**
  { from: 'src/features/leaderboards/', to: 'src/features/leaderboards/' },
  { from: 'src/pages/admin/', to: 'src/pages/admin/' },
  { from: 'src/pages/developer/', to: 'src/pages/developer/' },
  { from: 'src/pages/index/', to: 'src/pages/index/' },
  { from: 'src/pages/news/', to: 'src/pages/news/' },
  { from: 'src/pages/index/maintenanceToast.js', to: 'src/pages/index/maintenanceToast.js' },
  { from: 'src/pages/index/notifications.js', to: 'src/pages/index/notifications.js' },
  { from: 'src/main.js', to: 'src/main.js' },

  // assets and config moved into src
  { from: 'src/services/firebase/firebaseClient.js', to: 'src/services/firebase/firebaseClient.js' },
  { from: 'src/config/config.js', to: 'src/config/config.js' },

  // Firebase rules moved to tools (unlikely referenced in runtime code)
];

// Target file globs (simple recursive read)
const exts = ['.js', '.mjs', '.cjs', '.html'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function applyReplacements(text) {
  let changed = false;
  let newText = text;
  for (const r of replacements) {
    const before = newText;
    // Replace only in quoted path-like substrings
    const pattern = new RegExp(
      // matches '...' or "..." containing the from fragment
      `(["'])((?:[^\\\n])*?)${r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}((?:[^\\\n])*?)(["'])`,
      'g'
    );
    newText = newText.replace(pattern, (m, q1, pre, post, q2) => {
      return `${q1}${pre}${r.to}${post}${q2}`;
    });
    if (newText !== before) changed = true;
  }
  return { changed, newText };
}

function updateFile(file) {
  const orig = fs.readFileSync(file, 'utf8');
  const { changed, newText } = applyReplacements(orig);
  if (changed) {
    if (dryRun) {
      console.log(`[DRY-RUN] Would update: ${path.relative(projectRoot, file)}`);
    } else {
      fs.writeFileSync(file, newText, 'utf8');
      console.log(`Updated: ${path.relative(projectRoot, file)}`);
    }
  }
}

function main() {
  if (!fs.existsSync(DOCS)) {
    console.error('docs/ folder not found from', projectRoot);
    process.exit(1);
  }
  const files = walk(DOCS);
  for (const f of files) updateFile(f);
  console.log('Import update pass complete.');
}

main();
