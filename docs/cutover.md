# Cutover: from loose `~/.claude` files to this repo

## What this repo replaces

Before this overhaul, the `/spec`, `/plan`, `/build`, `/review`, `/test`, `/ship`, `/webperf`, `/code-simplify`, `/quiz` commands and their skills lived as loose, hand-edited files in `~/.claude/commands/` and `~/.claude/skills/` — installed once from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and then customized in place, with no version control and no way to pull upstream improvements without re-diffing by hand.

This repo is the same workflow, git-tracked, and installable as a proper plugin into any harness (Claude Code, Codex, Gemini CLI, OpenCode, Antigravity). See `spec/agent-skills-overhaul/spec.md` for the full rationale.

## Upstream credit

This is a fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) by Addy Osmani, MIT-licensed. The skill content, command structure, validator scripts, and most of `docs/` are vendored from there (v0.6.8) and then customized — see the spec for exactly what changed and why.

## What stays local, not in this repo

- **`~/.claude/commands/aidesigner.md`** — wraps the `aidesigner` MCP server, not an engineering-lifecycle skill. Unrelated to this plugin.
- **`~/.claude/CLAUDE.md` / `~/.claude/RTK.md`** — machine-level personal preferences (e.g. no `Co-Authored-By` trailer on commits). These are personal git/tooling preferences, not portable engineering workflow — deliberately not duplicated into this now-shareable repo.
- **`~/.claude/skills/graphify/`** — a separate plugin (knowledge-graph tool), not part of agent-skills.

## Retiring the loose files (do this only after verifying the plugin install works — see T6.1/T6.2 in the plan)

1. Back up `~/.claude/commands/` and `~/.claude/skills/` to a timestamped directory.
2. Remove the files now provided by the installed plugin (everything except the three items above).
3. Confirm `/help` (or the equivalent in your harness) lists each command exactly once — a loose file and the plugin both defining `/build` will shadow each other silently.

## Known platform gap: `.opencode/skills`

Upstream ships `.opencode/skills` as a symlink to `../skills`. This checkout has no symlink privilege (no `core.symlinks` / Windows dev mode), so `.opencode/skills` here is a **plain copy** instead. `npm run validate` runs `scripts/validate-opencode-sync.js` to catch the copy drifting from `skills/` after a future edit. If you're on a platform with symlink support, you can replace the copy with a real symlink and the validator will just report "nothing to check" once `.opencode/skills` stops existing as a plain directory... actually keep the validator either way — it degrades gracefully if the copy is later replaced by a symlink (`fs.existsSync` still finds it, walk still works through it).
