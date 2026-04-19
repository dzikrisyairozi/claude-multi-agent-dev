#!/usr/bin/env bash
# claude-multi-agent-dev · install into an existing project
#
# Installs the orchestration layer (agents, hooks, dashboard, scripts) into
# an existing repo without clobbering what's already there.
#
# - Copies "new" files verbatim (agents, commands, hooks, dashboard, scripts)
# - MERGES .mcp.json, .claude/settings.json, package.json scripts
# - APPENDS to CLAUDE.md and .gitignore
# - Backs up every modified file to .orchestration-backup-<timestamp>/
# - Refuses to overwrite conflicting files unless --force is passed
#
# Usage:
#   bash scripts/install-into.sh <target-repo-path> [--force]
#
# Re-run safely: the script is idempotent. Files already in place are skipped
# unless their content differs, in which case --force is required.

set -euo pipefail

# ---------- args ----------
TARGET="${1:-}"
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
  esac
done

if [ -z "$TARGET" ] || [ "$TARGET" = "--force" ]; then
  echo "usage: bash scripts/install-into.sh <target-repo-path> [--force]"
  exit 1
fi

# ---------- pretty output ----------
c_reset="\033[0m"
c_bold="\033[1m"
c_dim="\033[2m"
c_red="\033[31m"
c_green="\033[32m"
c_yellow="\033[33m"
c_cyan="\033[36m"

ok()   { printf "  ${c_green}✓${c_reset} %s\n" "$1"; }
warn() { printf "  ${c_yellow}!${c_reset} %s\n" "$1"; }
err()  { printf "  ${c_red}✗${c_reset} %s\n" "$1"; }
step() { printf "\n${c_bold}${c_cyan}==>${c_reset} ${c_bold}%s${c_reset}\n" "$1"; }
skip() { printf "  ${c_dim}· %s${c_reset}\n" "$1"; }

# ---------- paths ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
DST="$(cd "$TARGET" 2>/dev/null && pwd)" || {
  err "target does not exist: $TARGET"
  exit 1
}

if [ "$SRC" = "$DST" ]; then
  err "source and target are the same directory — this script is for INSTALLING into a DIFFERENT repo"
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$DST/.orchestration-backup-$TIMESTAMP"

printf "\n${c_bold}claude-multi-agent-dev · install${c_reset}\n"
printf "  source: ${c_dim}%s${c_reset}\n" "$SRC"
printf "  target: ${c_dim}%s${c_reset}\n" "$DST"
printf "  force : ${c_dim}%s${c_reset}\n" "$FORCE"

# ---------- preflight ----------
step "preflight"

if ! command -v node >/dev/null 2>&1; then
  err "node not found — Node.js 18+ is required"
  exit 1
fi
NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "node >= 18 required, found $(node -v)"
  exit 1
fi
ok "node $(node -v)"

if [ ! -d "$DST/.git" ]; then
  warn "target is not a git repo — proceeding anyway"
else
  ok "target is a git repo"
fi

# ---------- helpers ----------
backup() {
  local rel="$1"
  if [ -f "$DST/$rel" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
    cp "$DST/$rel" "$BACKUP_DIR/$rel"
  fi
}

# copy_safe <rel-path>
#   Copies a single file from SRC to DST. If the file already exists at the
#   destination and is DIFFERENT, stops unless --force. If identical, skips.
copy_safe() {
  local rel="$1"
  local srcf="$SRC/$rel"
  local dstf="$DST/$rel"

  if [ ! -f "$srcf" ]; then
    warn "source missing (template bug): $rel"
    return 0
  fi

  if [ -f "$dstf" ]; then
    if cmp -s "$srcf" "$dstf"; then
      skip "same: $rel"
      return 0
    fi
    if [ "$FORCE" -ne 1 ]; then
      err "conflict: $rel already exists and differs. Re-run with --force to overwrite (a backup will be saved)."
      return 1
    fi
    backup "$rel"
    ok "overwriting (backed up): $rel"
  else
    ok "new: $rel"
  fi
  mkdir -p "$(dirname "$dstf")"
  cp "$srcf" "$dstf"
}

# copy_dir_safe <rel-dir>
#   Recursively copy_safe every file in a directory.
copy_dir_safe() {
  local rel="$1"
  local srcd="$SRC/$rel"
  if [ ! -d "$srcd" ]; then
    warn "source dir missing: $rel"
    return 0
  fi
  ( cd "$srcd" && find . -type f -not -path './node_modules/*' -not -name '.dashboard.pid' -not -name 'dashboard.log' -print0 ) | \
    while IFS= read -r -d '' f; do
      local clean="${f#./}"
      copy_safe "$rel/$clean" || return 1
    done
}

# ---------- 1. copy-safe files ----------
step "copying orchestration files"

# These must not exist in the target (or must match)
copy_dir_safe ".claude/agents"
copy_dir_safe ".claude/commands"
copy_dir_safe ".claude/hooks"
copy_safe "scripts/start-dashboard.sh"
copy_safe "scripts/setup.sh"

# Dashboard directory (skip node_modules)
copy_dir_safe "dashboard"

# ---------- 2. merge .mcp.json ----------
step "merging .mcp.json"

mkdir -p "$BACKUP_DIR"
backup ".mcp.json"

node - "$SRC/.mcp.json" "$DST/.mcp.json" <<'NODE'
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const [,, srcP, dstP] = process.argv;
const src = JSON.parse(readFileSync(srcP, 'utf8'));
const dst = existsSync(dstP) ? JSON.parse(readFileSync(dstP, 'utf8')) : { mcpServers: {} };
dst.mcpServers = dst.mcpServers || {};
let added = 0, kept = 0;
for (const [name, cfg] of Object.entries(src.mcpServers || {})) {
  if (dst.mcpServers[name]) {
    kept++;
    process.stderr.write(`  · kept existing: ${name}\n`);
  } else {
    dst.mcpServers[name] = cfg;
    added++;
    process.stderr.write(`  + added: ${name}\n`);
  }
}
writeFileSync(dstP, JSON.stringify(dst, null, 2) + '\n');
process.stderr.write(`  (${added} added, ${kept} kept)\n`);
NODE

# ---------- 3. merge .claude/settings.json ----------
step "merging .claude/settings.json"

backup ".claude/settings.json"

node - "$SRC/.claude/settings.json" "$DST/.claude/settings.json" <<'NODE'
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const { dirname } = require('node:path');
const [,, srcP, dstP] = process.argv;
mkdirSync(dirname(dstP), { recursive: true });
const src = JSON.parse(readFileSync(srcP, 'utf8'));
const dst = existsSync(dstP) ? JSON.parse(readFileSync(dstP, 'utf8')) : {};
dst.hooks = dst.hooks || {};
let added = 0;

function hookFingerprint(h) {
  const cmds = (h.hooks || []).map(x => x.command || '').join('|');
  return `${h.matcher || '.*'}::${cmds}`;
}

for (const [event, entries] of Object.entries(src.hooks || {})) {
  dst.hooks[event] = dst.hooks[event] || [];
  const existing = new Set(dst.hooks[event].map(hookFingerprint));
  for (const entry of entries) {
    const fp = hookFingerprint(entry);
    if (existing.has(fp)) {
      process.stderr.write(`  · kept existing ${event} hook\n`);
    } else {
      dst.hooks[event].push(entry);
      added++;
      process.stderr.write(`  + added ${event} hook\n`);
    }
  }
}

if (!dst.$schema && src.$schema) dst.$schema = src.$schema;

writeFileSync(dstP, JSON.stringify(dst, null, 2) + '\n');
process.stderr.write(`  (${added} hook entries added)\n`);
NODE

# ---------- 4. merge package.json scripts ----------
step "adding scripts to package.json"

if [ ! -f "$DST/package.json" ]; then
  warn "no package.json in target — creating a minimal one"
  mkdir -p "$DST"
  cat > "$DST/package.json" <<'JSON'
{
  "name": "my-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {}
}
JSON
fi

backup "package.json"

node - "$DST/package.json" <<'NODE'
const { readFileSync, writeFileSync } = require('node:fs');
const [,, p] = process.argv;
const pkg = JSON.parse(readFileSync(p, 'utf8'));
pkg.scripts = pkg.scripts || {};
const toAdd = {
  'orchestration:setup'    : 'bash scripts/setup.sh',
  'orchestration:dashboard': 'bash scripts/start-dashboard.sh',
  'orchestration:stop'     : "bash -c 'if [ -f dashboard/.dashboard.pid ]; then kill $(cat dashboard/.dashboard.pid) 2>/dev/null; rm dashboard/.dashboard.pid; echo stopped; else echo not running; fi'"
};
let added = 0, kept = 0;
for (const [k, v] of Object.entries(toAdd)) {
  if (pkg.scripts[k]) {
    process.stderr.write(`  · kept existing: ${k}\n`);
    kept++;
  } else {
    pkg.scripts[k] = v;
    process.stderr.write(`  + added: ${k}\n`);
    added++;
  }
}
writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
process.stderr.write(`  (${added} added, ${kept} kept)\n`);
NODE

# ---------- 5. append to CLAUDE.md ----------
step "updating CLAUDE.md"

CLAUDE_MARK="<!-- claude-multi-agent-dev:orchestration -->"
if [ -f "$DST/CLAUDE.md" ] && grep -qF "$CLAUDE_MARK" "$DST/CLAUDE.md"; then
  skip "CLAUDE.md already has the orchestration section"
else
  backup "CLAUDE.md"
  touch "$DST/CLAUDE.md"
  cat >> "$DST/CLAUDE.md" <<'MD'

<!-- claude-multi-agent-dev:orchestration -->

# Multi-Agent Orchestration (installed via claude-multi-agent-dev)

This project has the multi-agent orchestration layer installed on top of its existing codebase.

## Entry point

Run `/start <what you want to build>`. The command will:

1. Verify your `.env` and GitHub auth
2. Detect the existing stack (it will NOT rescaffold) and continue with whatever is already here
3. Delegate to the `lead-engineer` agent, who plans the work as GitHub issues, dispatches specialists, reviews PRs, and merges

## Agents

- `lead-engineer` — plans, reviews, merges (Opus)
- `frontend-engineer` — implements UI tickets using the project's existing frontend stack and Tailwind CSS
- `backend-engineer` — implements APIs, schema, auth, business logic
- `uiux-designer` — writes detailed UI/UX specs as issue comments before frontend work
- `qa-engineer` — code-reviews and Playwright-tests every PR

Only the Lead can merge. Every PR needs both Lead review and QA sign-off.

## Rules in this repo

- All coordination happens through GitHub issues and PRs
- Branch names: `feat/issue-<number>-<slug>` or `fix/issue-<number>-<slug>`
- PR body must include `Closes #<number>` and reference acceptance criteria
- Labels: `agent:lead|frontend|backend|uiux|qa`, `status:todo|in-progress|review|qa-testing|done`
- Never force-push to `main`. Never bypass hooks.
- The `lead-engineer` never writes feature code — it always delegates

## Dashboard

`http://localhost:${DASHBOARD_PORT:-3456}` after running:

```bash
npm run orchestration:dashboard
# or
bash scripts/start-dashboard.sh
```

MD
  ok "appended orchestration section to CLAUDE.md"
fi

# ---------- 6. .gitignore additions ----------
step "updating .gitignore"

GI="$DST/.gitignore"
touch "$GI"
backup ".gitignore"

add_ignore() {
  local pattern="$1"
  if grep -qxF "$pattern" "$GI" 2>/dev/null; then
    skip "already ignored: $pattern"
  else
    echo "$pattern" >> "$GI"
    ok "ignored: $pattern"
  fi
}

# Add a header block once
if ! grep -qF "# claude-multi-agent-dev" "$GI"; then
  {
    echo ""
    echo "# claude-multi-agent-dev"
  } >> "$GI"
fi
add_ignore ".env"
add_ignore "dashboard/node_modules/"
add_ignore "dashboard/.dashboard.pid"
add_ignore "dashboard/dashboard.log"
add_ignore ".orchestration-backup-*/"
add_ignore ".claude/settings.local.json"

# ---------- 7. env var instructions ----------
step "next steps"

printf "\n  ${c_bold}add these to your ${c_cyan}.env${c_reset}${c_bold} (create if missing):${c_reset}\n\n"
cat <<EOF
    GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    GITHUB_OWNER=<your-github-owner>
    GITHUB_REPO=<this-repo>
    DASHBOARD_PORT=3456
EOF

printf "\n  ${c_bold}then run:${c_reset}\n\n"
cat <<EOF
    bash scripts/setup.sh              # validate env + create GitHub labels
    bash scripts/start-dashboard.sh    # http://localhost:3456
    claude
    > /start <what you want to build>
EOF

if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
  printf "\n  ${c_dim}backups of any modified files are in:${c_reset}\n"
  printf "    %s\n" "$BACKUP_DIR"
fi

printf "\n  ${c_green}✓ installed${c_reset}\n\n"
