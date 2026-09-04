#!/usr/bin/env node
/**
 * validate-opencode-sync.js
 *
 * .opencode/skills should be a symlink to ../skills, but this checkout has no
 * symlink privilege (see the Phase 4 commit), so it's a plain copy instead.
 * A copy can silently drift from the source on the next skill edit — this
 * catches that before it ships.
 *
 * Exit codes: 0 = in sync, 1 = drifted
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'skills');
const COPY = path.join(ROOT, '.opencode', 'skills');

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, base));
    } else {
      out.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(COPY)) {
    console.log('.opencode/skills does not exist — nothing to check.');
    return;
  }

  const sourceFiles = new Set(walk(SOURCE));
  const copyFiles = new Set(walk(COPY));

  const missing = [...sourceFiles].filter((f) => !copyFiles.has(f));
  const extra = [...copyFiles].filter((f) => !sourceFiles.has(f));
  const contentDrift = [...sourceFiles]
    .filter((f) => copyFiles.has(f))
    .filter((f) => !fs.readFileSync(path.join(SOURCE, f)).equals(fs.readFileSync(path.join(COPY, f))));

  const errors = missing.length + extra.length + contentDrift.length;

  if (errors === 0) {
    console.log(`.opencode/skills is in sync with skills/ (${sourceFiles.size} files).`);
    return;
  }

  console.log('.opencode/skills has drifted from skills/:');
  for (const f of missing) console.log(`  ✗  missing from .opencode/skills: ${f}`);
  for (const f of extra) console.log(`  ✗  present only in .opencode/skills: ${f}`);
  for (const f of contentDrift) console.log(`  ✗  content differs: ${f}`);
  console.log('\nRe-copy skills/ into .opencode/skills/ (or create the symlink if this');
  console.log('environment supports it) and re-run.');
  process.exit(1);
}

main();
