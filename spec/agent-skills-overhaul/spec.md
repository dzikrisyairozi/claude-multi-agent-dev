# Agent Skills Overhaul — Spec

## 1. Objective

Replace this repo's current purpose (a Claude-only, GitHub-issue-driven multi-agent orchestration template) with a **harness-agnostic personal skills library**, structured like [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), and set it up as the **single source of truth** for the owner's (dzikrisyairozi) global `spec → plan → build → test → review → ship` workflow across every coding-agent harness they use (Claude Code, Codex, Gemini CLI, OpenCode, Cursor, Windsurf, Antigravity).

Target user: the repo owner only, across machines/harnesses. Not building for public-adoption polish (no CONTRIBUTING funnel, no eval-grading CI) unless it's cheap to keep from upstream.

Non-negotiable constraint: this overhaul must **not lose** the workflow customizations already hand-tuned into `~/.claude/commands/*.md` (spec/plan/build/review/test/ship/webperf/code-simplify) — those get merged forward into the new structure, not overwritten by upstream's generic versions.

## 2. Scope decisions (confirmed via clarifying questions)

| Decision | Answer |
|---|---|
| Existing multi-agent system (dashboard, lead/backend/frontend/qa/uiux agents, GitHub-issue workflow) | **Delete entirely.** No tag/branch preserved — git history already has it. |
| Repo's relationship to `~/.claude` global config | **Becomes the source of truth.** Global commands/skills get installed *from* this repo (plugin install / skills CLI / local `--plugin-dir`), not hand-edited in place anymore. |
| Harness coverage | **Full parity with upstream** — Claude Code, Codex, Gemini CLI, OpenCode, plus generic `commands/*.toml`, from the first pass. |
| Task/plan/review artifact path | **Keep `tasks/<feature-name>/`** (plan.md, todo.md, review/) — matches what's already wired into the current `build.md`/`review.md`/`plan.md`, contradicts nothing, zero rework. `spec/<feature-name>/spec.md` stays as-is (this file is an example of it). |

## 3. What gets deleted

- `dashboard/` (entire directory — server, public assets, package.json/lock)
- `.claude/agents/lead-engineer.md`, `backend-engineer.md`, `frontend-engineer.md`, `qa-engineer.md`, `uiux-designer.md`
- `.claude/commands/start.md`
- `.claude/hooks/emit.mjs`, `.claude/hooks/ensure-dashboard.mjs`
- `scripts/setup.sh`, `scripts/start-dashboard.sh`, `scripts/install-into.sh`
- `.env.example` (was `GITHUB_OWNER`/`GITHUB_REPO`/`DASHBOARD_PORT` — no longer relevant)
- `.mcp.json` (github + playwright MCP servers were wired for the orchestration flow; `/review` already uses `gh` CLI directly, not MCP — drop unless a specific new skill needs a repo-level MCP server)
- Current `CLAUDE.md` (multi-agent workflow rules) and `README.md` (multi-agent template pitch) — replaced, see below
- `.claude/settings.json` hook wiring tied to the deleted hooks (rewritten from scratch for whatever the new repo actually needs, likely close to empty)

Kept as-is: `LICENSE` (MIT), `.serena/` (project indexing, unrelated to this rewrite), `.git` history.

## 4. New project structure

Mirrors upstream's layout exactly (full harness parity):

```
skills/<name>/SKILL.md            # + optional scripts/, references/ per skill
commands/*.toml                   # harness-agnostic generic command defs
.claude/commands/*.md             # Claude wrapper — invokes the skill, our path conventions baked in
.claude/rules/*.md                # short policies (not full skill text)
.claude-plugin/plugin.json        # Claude plugin manifest
.claude-plugin/marketplace.json   # Claude marketplace entry (points at this repo)
.codex-plugin/plugin.json
.gemini/commands/*.toml
.opencode/skills/                 # synced from skills/
agents/*.md                       # subagent personas (code-reviewer, security-auditor, test-engineer, web-performance-auditor)
references/*.md                   # shared checklists (security, performance, testing, a11y, observability, orchestration patterns, definition-of-done)
docs/*-setup.md                   # per-harness install docs + skill-anatomy.md + getting-started.md
scripts/validate-*.js             # ported from upstream, adapted if paths differ
hooks/                            # session-start.sh etc. — ported, evaluated for relevance
AGENTS.md, CLAUDE.md              # repo-level agent instructions (about this repo, not the old workflow)
README.md                         # rewritten for the new purpose
plugin.json                       # root manifest (skills CLI)
package.json                      # trimmed to validation scripts only, no dashboard deps
```

`evals/` (upstream's eval-case + fixtures + `run-evals.js` harness): **proposed skip for v1** — it's grading infrastructure for a public-adoption project; this is a single-user repo. Flagged as an open question below rather than assumed.

## 5. Preferences to carry forward verbatim (do not let upstream text overwrite these)

Merged from the current `~/.claude/commands/*.md` into the new `.claude/commands/*.md` (and generic `commands/*.toml` where applicable):

1. **Path conventions** — `spec/<feature-name>/spec.md`, `tasks/<feature-name>/plan.md` + `todo.md`, `tasks/<feature-name>/review/{plan.md,todo.md}`. Issue-number prefix when a GitHub issue exists (`spec/377-chat-surface-materials/`). Never write `SPEC.md`/`tasks/plan.md` at repo root.
2. **Tool-choice guidance with the actual measurements**, e.g.: grep/`git grep` as the default reference-finder over serena's `find_referencing_symbols` (which under-counts cross-package refs) and over `graphify` (conflates similarly-named symbols, pulls in barrel-re-export noise) — keep the dated benchmark notes, not just the conclusion.
3. **`cavecrew-investigator` subagent** as the broad-search alternative to vanilla `Explore` (measured: same accuracy, ~31% smaller output).
4. **`/build` branch safety** — never commit to `master`/`main`/`develop`; create `<type>/<slug>` off it first.
5. **`/build auto`** — single up-front approval, then autonomous per-task RED→GREEN→regression→build→commit loop; stop-and-ask conditions (broken build with no obvious fix, ambiguous spec, irreversible/high-risk task).
6. **Comprehension gate** — `/quiz` protocol (5 questions, 4/5 to pass) gates hand-off at the end of `/build`, not every local commit.
7. **`/review`** — five-axis review; PR mode posts via `gh pr comment`; always chains a `/ponytail-review` over-engineering pass as an add-on; writes remediation plan to `tasks/<feature>/review/`.
8. **No Claude/Co-Authored-By attribution trailer** — this is already enforced in the *private* `~/.claude/CLAUDE.md` (machine-level, not this repo). **Proposal: do not duplicate it into this public repo's `CLAUDE.md`/`AGENTS.md`** — it's a personal git preference, not a portable skill convention, and this repo is meant to be shareable. Flagged below for explicit confirmation since it touches "what my preferences are."

## 6. Commands (this repo's own dev loop going forward)

- No app to build (this is a markdown/config repo).
- `node scripts/validate-skills.js` (+ sibling validators) — the "test suite": checks SKILL.md frontmatter, command↔skill wiring, path/version/reference-link consistency. Ported from upstream, run via `npm run validate`.
- Local install smoke test: `claude --plugin-dir .` (Claude Code), equivalent local-install flags for Codex/Gemini/OpenCode per their docs.
- No CI required beyond optionally keeping upstream's `test-plugin-install.yml` workflow (cheap to keep, low priority to add).

## 7. Testing strategy

- Reuse upstream's `scripts/validate-*.js` as-is (or with minimal path adaptation) — don't hand-roll new validation logic for a solved problem.
- Manual acceptance: after rebuild, install into a scratch Claude Code session and fire every custom command (`/spec`, `/plan`, `/build`, `/build auto`, `/test`, `/review`, `/ship`, `/webperf`, `/code-simplify`, and upstream's new `/constraints`) and confirm each still carries the preferences in §5 — not just that it runs.
- `evals/` — skipped for v1 per §4 (open question).

## 8. Boundaries

**Always:**
- Preserve every item in §5 verbatim when merging upstream skill/command text.
- Keep MIT license and existing git history intact.
- Follow this repo's *own* forthcoming `/plan` → `/build` workflow to execute this overhaul (meta, but consistent — no giant unreviewed commit).

**Ask first:**
- Renaming the GitHub repo (currently `dzikrisyairozi/claude-multi-agent-dev`) or changing its description — separate irreversible-ish decision, not assumed here.
- Retiring/deleting the hand-maintained `~/.claude/commands/*.md` and `~/.claude/skills/*` — only after the new repo's install path is verified working end-to-end.
- Pushing any of this to the `origin` remote, or opening a PR.
- Whether to include `evals/` and `hooks/` (session-start etc.) at all — see open questions.

**Never:**
- Silently drop the dated tool-benchmark notes when merging upstream's newer skill text over the current one.
- Add a Co-Authored-By/Claude attribution trailer anywhere in this repo's own commit-convention docs.
- Auto-push or auto-open a PR for this overhaul without explicit go-ahead.

## 9. Open questions (need explicit answers before `/plan`)

1. **Repo identity** — keep the name `claude-multi-agent-dev` (stale, describes the deleted system) or rename? If rename, to what (e.g. `agent-skills`, `dzikrisyairozi-skills`)? Renaming the GitHub repo itself needs a separate explicit go-ahead per §8.
2. **`evals/` harness** — port it (25 eval cases + fixtures + `run-evals.js`), or skip since you're the only consumer and can just try commands manually?
3. **`hooks/`** (`session-start.sh`, `simplify-ignore.sh`, `sdd-cache-*.sh`) — port these upstream automation hooks, or skip until a specific need shows up?
4. **`agents/*.md`** subagent personas (code-reviewer, security-auditor, test-engineer, web-performance-auditor) — port as-is, or fold into the `cavecrew-*` subagents you already use via the caveman plugin (possible overlap)?
5. **§5 item 8 confirmation** — agreed the no-attribution-trailer rule stays private (`~/.claude/CLAUDE.md`) rather than being duplicated into this now-shareable repo?
