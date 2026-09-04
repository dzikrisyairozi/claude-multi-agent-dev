# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Antigravity, OpenCode, etc.) when working **on this repository itself**.

> **Scope:** This file configures agents working on the `dzikrisyairozi/claude-multi-agent-dev` repository (this skill pack). It is not meant to be copied into other projects; the reusable assets are the skills in `skills/`, and downstream projects get their own project-specific rules file (`CLAUDE.md`, `.cursorrules`, etc.) via `context-engineering`.

## Repository Overview

A personal, harness-agnostic collection of engineering-lifecycle skills, forked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and customized — see `spec/agent-skills-overhaul/spec.md` and `docs/cutover.md` for what changed and why.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `skills/` directory (no slash commands there).

### Core Rules

- If a task matches a skill, invoke it — never implement directly if a skill applies.
- Skills are located in `skills/<skill-name>/SKILL.md`.
- Follow the skill instructions exactly (do not partially apply them).

### Lifecycle Mapping (Implicit Commands)

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

For every request: determine if a skill applies (even a small chance), invoke it via the `skill` tool, follow the workflow strictly, and only implement after required gated steps (spec, plan) are complete. "This is too small for a skill" and "I'll just quickly implement this" are rationalizations to ignore, not reasons to skip a skill that applies.

## Orchestration: Personas, Skills, and Commands

Three composable layers, not to be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/*.md`, `commands/*.toml`, `.gemini/commands/*.toml`) — user-facing entry points. The *when*.

**The user (or a slash command) is the orchestrator. Personas do not invoke other personas.** A persona may invoke skills. The only endorsed multi-persona pattern is **parallel fan-out with a merge step** — `/ship` runs `code-reviewer`, `security-auditor`, and `test-engineer` concurrently, then synthesizes. Do not build a "router" persona.

See `docs/agents.md` for the decision matrix and `references/orchestration-patterns.md` for the pattern catalog.

**Claude Code interop:** personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory). Subagents cannot spawn other subagents.

## Adding or Changing a Skill

Skills are markdown-first: `skills/<kebab-case-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and the standard section anatomy (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification). Add a `scripts/` or `references/` directory only when the skill actually needs runnable helpers or skill-specific docs.

For the full format, naming conventions, and writing principles: `docs/skill-anatomy.md`. Don't restate that guidance here.

**Every skill change must land on all three command surfaces if it touches a command** (`.claude/commands/*.md`, `commands/*.toml`, `.gemini/commands/*.toml`) — regenerate the TOML surfaces from the `.md` source rather than hand-editing them separately (see the generator used in the original overhaul, `tasks/agent-skills-overhaul/plan.md` Phase 3, or write the equivalent). `npm run validate` catches drift between the three.

## Before Committing

```bash
npm run validate   # skill/command/version/artifact-path/reference-link/opencode-sync checks
npm test            # unit tests for the validators themselves
```

Both must pass. `validate-artifact-paths.js` specifically guards the `spec/<feature-name>/` → `tasks/<feature-name>/` → `/build` pipeline against silent path drift — read its file header before changing any spec/plan path convention.

## Boundaries

- **Always:** follow `docs/skill-anatomy.md` for new/changed skills; keep the per-feature `spec/<feature-name>/` and `tasks/<feature-name>/` path convention (this is the repo's whole reason for forking, don't regress it back to upstream's root-level convention); run `npm run validate` + `npm test` before committing.
- **Ask first:** renaming the repo or plugin; deleting a skill or command; pushing to `origin`; anything under `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/` (these are the install surface for every harness).
- **Never:** duplicate content between skills — reference the other skill instead; add a skill that's vague advice instead of an actionable process; let a command's three surfaces (`.md` + two `.toml`) drift out of sync.
