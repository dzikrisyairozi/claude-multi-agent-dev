# claude-multi-agent-dev (agent-skills)

This is a personal, harness-agnostic engineering-skills pack — forked from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and customized around a per-feature `spec/<feature-name>/` and `tasks/<feature-name>/` artifact convention. See `spec/agent-skills-overhaul/spec.md` for the full rationale and `docs/cutover.md` for what changed vs. upstream.

> **Scope:** This file configures agents working on **this repository** (the skill pack itself), not other projects. Don't copy it into another project or a global agent configuration — the reusable assets are the skills in `skills/`.

## Project Structure

```
skills/            → Core skills (SKILL.md per directory)
agents/             → Reusable agent personas (code-reviewer, test-engineer, security-auditor, web-performance-auditor)
.claude/commands/   → Claude Code commands (/spec, /plan, /build, /test, /review, /code-simplify, /ship, /webperf, /constraints, /quiz)
commands/, .gemini/commands/ → generic + Gemini CLI mirrors of the same commands
.claude-plugin/, .codex-plugin/, .agents/plugins/, .opencode/ → per-harness plugin manifests/surfaces
references/         → Supplementary checklists (testing, performance, security, accessibility, observability, orchestration)
docs/               → Setup guides per harness + skill-anatomy.md + cutover.md
scripts/            → Validators (npm run validate) and their tests (npm test)
spec/, tasks/       → This repo's own spec/plan artifacts — tracked here (not gitignored), see the T0.2 note in tasks/agent-skills-overhaul/plan.md
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
**Plan:** planning-and-task-breakdown, constraint-driven-development
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, frontend-ui-engineering, api-and-interface-design
**Verify:** browser-testing-with-devtools, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening, performance-optimization
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, observability-and-instrumentation, shipping-and-launch

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`, YAML frontmatter with `name` + `description` (description: what it does, then "Use when...").
- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification.
- Shared references live in root `references/`; a skill's own references live in `skills/<name>/references/`.
- **Path convention (the reason this fork exists):** specs at `spec/<feature-name>/spec.md`, plans at `tasks/<feature-name>/plan.md`, task lists at `tasks/<feature-name>/todo.md`, review remediation at `tasks/<feature-name>/review/{plan,todo}.md`. Never write these at the top level (`SPEC.md`, `tasks/plan.md`) — `SPEC.md`/`docs/SPEC.md` are recognized only as legacy fallback locations `/build` still checks.
- Every skill change that touches a command must update all three surfaces: `.claude/commands/*.md`, `commands/*.toml`, `.gemini/commands/*.toml`.

## Commands

- `npm run validate` — skill frontmatter, command parity across the 3 surfaces, manifest version agreement, spec/plan artifact-path drift, `references/` link resolution, `.opencode/skills` sync.
- `npm test` — unit tests for the validators (`node --test`).

## Boundaries

- **Always:** follow `docs/skill-anatomy.md` for new/changed skills; run `npm run validate` and `npm test` before committing; keep the per-feature path convention.
- **Ask first:** renaming this repo or the `agent-skills` plugin name; deleting a skill, command, or persona; pushing to `origin`; opening a PR.
- **Never:** add a skill that's vague advice instead of an actionable process; duplicate content between skills instead of referencing; let the three command surfaces drift out of sync.
