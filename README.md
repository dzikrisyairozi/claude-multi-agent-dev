# Agent Skills

Harness-agnostic engineering skills and lifecycle commands — spec, plan, build, test, review, ship — for AI coding agents.

This is a personal fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) by Addy Osmani (MIT-licensed), restructured around a per-feature `spec/<feature-name>/` and `tasks/<feature-name>/` artifact convention, plus grep-first tool guidance and a few workflow additions (a comprehension-gate `/quiz`, PR-mode `/review` that posts to GitHub). See `spec/agent-skills-overhaul/spec.md` for the full rationale and `docs/cutover.md` for what changed vs. upstream. Full attribution: `THIRD_PARTY_NOTICES.md`.

```
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  /spec          /plan          /build        /test         /review       /ship
```

## Commands

| What you're doing | Command | Key principle |
|---|---|---|
| Define what to build | `/spec` | Spec before code, saved to `spec/<feature-name>/spec.md` |
| Plan how to build it | `/plan` | Small, atomic tasks, saved to `tasks/<feature-name>/{plan,todo}.md` |
| Build incrementally | `/build` | One slice at a time; `/build auto` runs the whole plan in one approved pass |
| Prove it works | `/test` | Tests are proof |
| Set the quality bar | `/constraints` | Decide it once, enforce it everywhere |
| Review before merge | `/review` | Five-axis review; posts to the PR when the target is one |
| Audit web performance | `/webperf` | Measure before you optimize |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Parallel fan-out to code-reviewer/security-auditor/test-engineer, then a go/no-go |
| Comprehension gate | `/quiz` | 5 questions on the diff you just built — pass before it's cleared to hand off |

Skills also activate automatically based on what you're doing — designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`, and so on. Full list in `skills/`.

## Install

**Claude Code:**

```
claude --plugin-dir /path/to/this/repo
```

or, once pushed:

```
/plugin marketplace add dzikrisyairozi/claude-multi-agent-dev
/plugin install agent-skills@agent-skills
```

**Other harnesses:** Codex, Gemini CLI, OpenCode, Cursor, Windsurf, Antigravity, GitHub Copilot — see the setup guide for each in `docs/`.

**Generic / any agent that reads Markdown:** clone this repo and point your agent at `skills/<name>/SKILL.md`. See `docs/getting-started.md`.

## Structure

```
skills/<name>/SKILL.md      # 25 skill definitions
commands/*.toml              # generic slash commands
.claude/commands/*.md        # Claude Code commands
.gemini/commands/*.toml      # Gemini CLI commands
.claude-plugin/, .codex-plugin/, .agents/plugins/   # per-harness plugin manifests
.opencode/skills/            # copy of skills/ (see docs/cutover.md — no symlink on this checkout)
agents/*.md                  # subagent personas used by /ship and /webperf
references/*.md              # shared checklists (security, performance, testing, a11y, ...)
docs/                        # per-harness setup guides + skill-anatomy.md
scripts/                     # validators (npm run validate) + their tests (npm test)
spec/, tasks/                # this repo's own spec/plan artifacts — tracked, not gitignored
```

## Development

```bash
npm run validate   # skill/command/version/artifact-path/reference-link/opencode-sync checks
npm test            # unit tests for the validators
```

## License

MIT — see `LICENSE`. Vendored upstream content retains its original notice, see `THIRD_PARTY_NOTICES.md`.
