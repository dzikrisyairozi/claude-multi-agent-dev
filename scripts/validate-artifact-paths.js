#!/usr/bin/env node
/**
 * validate-artifact-paths.js
 *
 * Guards the spec -> plan -> build pipeline against silent artifact-path drift.
 *
 * The `/spec` and `/plan` commands (producers) write their artifacts to a set
 * of paths that the `/build` command and the spec/plan skills (consumers) read
 * back. When a producer moves an artifact without updating the consumers — as
 * in upstream PR #93, which pointed `/spec` and `/plan` at docs/features/[name]/
 * while `/build` still required SPEC.md and tasks/plan.md — the pipeline
 * breaks, and nothing else in CI catches it (command parity only compares
 * descriptions).
 *
 * This fork's convention is per-feature, not root-level: specs live at
 * `spec/<feature-name>/spec.md` and plans at `tasks/<feature-name>/{plan,todo}.md`
 * (see spec/agent-skills-overhaul/spec.md §5). ARTIFACT_PATTERNS matches any
 * concrete feature slug in that shape, not just the literal `<feature-name>`
 * placeholder — command files illustrate the convention with real examples
 * (e.g. `spec/377-chat-surface-materials/spec.md`), which must validate too.
 * `SPEC.md` / `docs/SPEC.md` stay allowlisted as the legacy locations build.md
 * still recognizes. Changing the convention means updating this file *and*
 * every guarded file in the same change; CI fails until they agree.
 *
 * Scope is deliberately narrow: only spec/plan/todo artifacts, only the files
 * that define the pipeline. It is not a general markdown path linter.
 *
 * Exit codes: 0 = all clear, 1 = one or more drifted paths.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Exact legacy paths build.md still recognizes as a fallback spec location.
const ARTIFACT_ALLOWLIST = new Set([
  'SPEC.md',
  'docs/SPEC.md',
]);

// The canonical per-feature shape: spec/<slug>/spec.md, tasks/<slug>/plan.md,
// tasks/<slug>/todo.md. <slug> is either the literal `<feature-name>`
// placeholder (as written in the convention description) or a real kebab-case
// slug, optionally issue-number-prefixed (as written in worked examples).
const ARTIFACT_PATTERNS = [
  /^spec\/(?:<feature-name>|[A-Za-z0-9][A-Za-z0-9._-]*)\/spec\.md$/i,
  /^tasks\/(?:<feature-name>|[A-Za-z0-9][A-Za-z0-9._-]*)\/plan\.md$/i,
  /^tasks\/(?:<feature-name>|[A-Za-z0-9][A-Za-z0-9._-]*)\/todo\.md$/i,
];

function isApproved(candidate) {
  if (ARTIFACT_ALLOWLIST.has(candidate)) return true;
  return ARTIFACT_PATTERNS.some((re) => re.test(candidate));
}

// The files that make up the spec -> plan -> build pipeline. Absent files are
// skipped, not failed: this validator checks path consistency, not presence.
const GUARDED_FILES = [
  '.claude/commands/spec.md',
  '.claude/commands/plan.md',
  '.claude/commands/build.md',
  'skills/spec-driven-development/SKILL.md',
  'skills/planning-and-task-breakdown/SKILL.md',
  'docs/getting-started.md',
  'docs/adoption-guide.md',
];

// Matches a path-like token ending in a spec/plan/todo artifact filename,
// including an optional directory prefix with bracket/angle placeholders like
// spec/<feature-name>/spec.md or docs/features/[feature-name]/spec.md.
// Case-insensitive so SPEC.md and a drifted spec.md are both caught, then
// compared against the allowlist/patterns.
const ARTIFACT_RE = /(?:[A-Za-z0-9._<>[\]-]+\/)*(?:spec|plan|todo)\.md/gi;

function findViolations(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null; // skipped

  const violations = [];
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const matches = line.match(ARTIFACT_RE);
    if (!matches) return;
    for (const match of matches) {
      if (!isApproved(match)) {
        violations.push({ line: i + 1, match });
      }
    }
  });
  return violations;
}

function main() {
  console.log('Checking spec/plan/todo artifact paths...\n');

  let checked = 0;
  let errors = 0;

  for (const relPath of GUARDED_FILES) {
    const violations = findViolations(relPath);
    if (violations === null) continue; // file not present, skip
    checked++;

    if (violations.length === 0) {
      console.log(`  ✓  ${relPath}`);
    } else {
      console.log(`  ✗  ${relPath}`);
      for (const { line, match } of violations) {
        console.log(`       L${line}: ${match} — not an approved spec/plan/todo artifact path`);
        errors++;
      }
    }
  }

  const status = errors > 0 ? 'FAILED' : 'PASSED';
  console.log(`\n${checked} files checked — ${errors} error(s) — ${status}`);

  if (errors > 0) {
    console.log('\nThe spec -> plan -> build pipeline expects one set of artifact paths.');
    console.log('Either use a path from ARTIFACT_ALLOWLIST, or change the convention');
    console.log('across every guarded file and update the allowlist in the same change.');
    process.exit(1);
  }
}

main();
