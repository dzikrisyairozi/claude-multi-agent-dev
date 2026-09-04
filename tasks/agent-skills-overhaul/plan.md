# Agent Skills Overhaul — Plan

Spec: `spec/agent-skills-overhaul/spec.md`
Upstream reference: `addyosmani/agent-skills` @ v0.6.8 (cloned to scratchpad for vendoring)

## Assumed defaults for the spec's open questions

Not answered yet — planned with these defaults. Say the word and the affected tasks change:

| Question | Assumed | Affected |
|---|---|---|
| Repo rename | Keep `claude-multi-agent-dev` for now; rename is a gated Phase 6 task | T6.3 |
| `evals/` (25 cases + fixtures + runner) | **Skip v1** — grading infra for a public project, you can just run the commands | — |
| `hooks/` (session-start, sdd-cache, simplify-ignore) | **Skip v1** — add when a concrete need appears | — |
| `agents/*.md` personas | **Port all 4** — part of "full parity"; overlap with `cavecrew-*` noted in docs, not resolved by deletion | T5.1 |
| No-attribution rule | Stays private in `~/.claude/CLAUDE.md`, not duplicated here | — |

## What the diff pass found (this changes the merge strategy)

Ran a file-by-file diff of `~/.claude/skills` + `~/.claude/commands` against upstream v0.6.8:

1. **Your installed SKILL.md files are essentially unmodified upstream, just older** (installed 2026-07-10). Of 24 differing files, the deltas are upstream churn: `references/x.md` → `../../references/x.md` link rewrites, description-field improvements, genericized npm examples.
2. **Exactly two SKILL.md files carry real customization:**
   - `spec-driven-development` — the `spec/<feature-name>/spec.md` output convention
   - `planning-and-task-breakdown` — the `tasks/<feature-name>/plan.md` + `todo.md` convention
   → So the merge is *take upstream wholesale, re-apply two conventions*, not a 24-way manual merge.
3. **Your customization mass lives in the command files**, not the skills:
   | Command | Local | Upstream | Delta |
   |---|---|---|---|
   | `build.md` | 1095w | 612w | branch safety, `/build auto`, comprehension gate |
   | `review.md` | 572w | 104w | five-axis detail, PR mode, `gh pr comment`, `tasks/<f>/review/`, ponytail chain |
   | `plan.md` | 301w | 116w | grep-vs-serena-vs-graphify benchmarks, `tasks/` paths |
   | `spec.md` | 253w | 133w | `spec/<f>/spec.md` path, tool guidance |
   | `test.md` | 136w | 99w | rtk/headroom note |
   | `quiz.md` | 301w | — | yours entirely, no upstream equivalent |
   | `ship.md`, `code-simplify.md` | = | = | only the namespace prefix differs |
   | `webperf.md` | identical | | |
4. **Upstream has one command + skill you don't:** `/constraints` + `constraint-driven-development`.
5. **Namespacing:** upstream commands invoke `agent-skills:<skill>`; yours invoke bare `<skill>` because your skills are loose files. Once this repo is a plugin, every command must use the new plugin namespace — a mechanical but repo-wide change.
6. **`.opencode/skills` is a symlink** to `../skills` upstream. Windows checkout needs `core.symlinks=true` or dev mode; fallback is a copy + a sync check.
7. Upstream has **no `package.json`** — validators run as plain `node scripts/validate-*.js`.

## Phases

Checkpoint after each phase. Every phase is one or more commits on `chore/agent-skills-overhaul`, never on `main`.

---

### Phase 0 — Baseline

- [ ] **T0.1 — Branch and baseline**
  - Acceptance: on branch `chore/agent-skills-overhaul` off latest `main`; `git status` clean apart from `spec/` and `tasks/` artifacts.
  - Verify: `git branch --show-current` prints the branch; `git log --oneline -1` matches `main`'s head.
  - Files: none (branch only)
- [ ] **T0.2 — Decide artifact tracking**
  - Your `spec-driven-development` convention says `spec/` and `tasks/` are gitignored working scratch. In *this* repo they are the design record for the overhaul itself.
  - Acceptance: `.gitignore` states the decision explicitly; spec + plan either committed or ignored, not half-tracked.
  - Verify: `git check-ignore -v spec/agent-skills-overhaul/spec.md` returns the expected result for the chosen policy.
  - Files: `.gitignore`
  - **Default: commit them** (this repo's spec *is* its documentation).

**Checkpoint 0:** branch exists, tracking policy settled.

---

### Phase 1 — Demolition

- [ ] **T1.1 — Delete the multi-agent orchestration system**
  - Delete: `dashboard/`, `.claude/agents/{lead-engineer,backend-engineer,frontend-engineer,qa-engineer,uiux-designer}.md`, `.claude/commands/start.md`, `.claude/hooks/{emit.mjs,ensure-dashboard.mjs}`, `scripts/{setup.sh,start-dashboard.sh,install-into.sh}`, `.env.example`, `.mcp.json`, `CLAUDE.md`, `README.md`.
  - Rewrite: `.claude/settings.json` (drop hook wiring for deleted hooks), `package.json` (drop dashboard scripts/keywords).
  - Keep: `LICENSE`, `.serena/`, `.gitignore` (edited), git history.
  - Acceptance: `grep -ril "dashboard\|lead-engineer\|DASHBOARD_PORT" . --exclude-dir=.git --exclude-dir=spec --exclude-dir=tasks` returns nothing.
  - Verify: that grep is empty; `git status` shows deletions only, no stray untracked leftovers.
  - Files: as listed above.

**Checkpoint 1:** repo is an empty shell with LICENSE + git history. One commit, revertable.

---

### Phase 2 — Skill library

- [ ] **T2.1 — Vendor upstream `skills/` at v0.6.8**
  - All 25 skills as `skills/<name>/SKILL.md` plus their `scripts/`/`references/` subdirs (`idea-refine/scripts/`, `constraint-driven-development/references/`).
  - Acceptance: 25 directories, each with a `SKILL.md` whose frontmatter `name` matches its directory.
  - Verify: `ls skills | wc -l` = 25; frontmatter/name check passes (formalized in T5.2).
  - Files: `skills/**`
- [ ] **T2.2 — Re-apply the two real customizations**
  - `skills/spec-driven-development/SKILL.md`: output convention → `spec/<feature-name>/spec.md`.
  - `skills/planning-and-task-breakdown/SKILL.md`: output convention → `tasks/<feature-name>/plan.md` + `todo.md`.
  - Acceptance: neither file instructs writing `SPEC.md` to the project root or `tasks/plan.md` at top level; both name the per-feature slug convention.
  - Verify: `grep -rn "SPEC.md in the project root\|tasks/plan.md" skills/` is empty; the two conventions appear verbatim.
  - Files: those two `SKILL.md` files.
- [ ] **T2.3 — Port `references/`**
  - The 7 shared checklists (accessibility, definition-of-done, observability, orchestration-patterns, performance, security, testing-patterns) — required because skills link to `../../references/*.md`.
  - Acceptance: every `../../references/<file>` referenced from any SKILL.md exists on disk.
  - Verify: link check (upstream's `validate-reference-links.js`, wired in T5.2) passes.
  - Files: `references/*.md`

**Checkpoint 2:** skills load standalone; conventions preserved.

---

### Phase 3 — Commands (preference-critical)

Each command exists on three surfaces that must stay in sync: `.claude/commands/<n>.md`, `commands/<n>.toml`, `.gemini/commands/<n>.toml`.

- [ ] **T3.1 — Merge the customized Claude commands**
  - For `build`, `review`, `plan`, `spec`, `test`: local file is the base; layer in any upstream additions that don't conflict; keep every preference from spec §5 verbatim (paths, benchmark notes, cavecrew, branch safety, `/build auto`, comprehension gate, ponytail chain, rtk/headroom note).
  - For `ship`, `code-simplify`, `webperf`: take upstream, namespace-prefix only.
  - Acceptance: the dated benchmark sentences (2026-08-07 grep measurement, 2026-08-08 cavecrew measurement) survive verbatim; all path conventions are `spec/<feature-name>/` and `tasks/<feature-name>/`.
  - Verify: `grep -rn "2026-08-07\|2026-08-08\|cavecrew-investigator\|tasks/<feature-name>" .claude/commands/` hits build/plan/review as expected.
  - Files: `.claude/commands/{build,review,plan,spec,test,ship,code-simplify,webperf}.md`
- [ ] **T3.2 — Add `/constraints` and carry `/quiz`**
  - `constraints.md` from upstream (new to you); `quiz.md` from your local set (new to upstream).
  - Acceptance: 10 commands present; `/quiz` still describes the 5-question / 4-to-pass gate that `/build` references.
  - Verify: `ls .claude/commands/*.md | wc -l` = 10; `/build`'s comprehension-gate section resolves to an existing `/quiz`.
  - Files: `.claude/commands/{constraints,quiz}.md`
- [ ] **T3.3 — Namespace every skill invocation**
  - Replace bare `Invoke the <skill> skill` with `Invoke the <plugin-name>:<skill> skill` across all command surfaces (plugin name settled in T4.1).
  - Acceptance: no command invokes a bare skill name.
  - Verify: `grep -rn "Invoke the " .claude/commands commands .gemini/commands | grep -v ":"` is empty.
  - Files: all command files.
- [ ] **T3.4 — Mirror to the generic + Gemini TOML surfaces**
  - Same prompt bodies as the `.md` versions, TOML-wrapped, for all 10 commands.
  - Acceptance: for each command, the three surfaces carry the same instructions (wording may differ only in the frontmatter/TOML wrapper).
  - Verify: `node scripts/validate-commands.js` (ported in T5.2) passes.
  - Files: `commands/*.toml`, `.gemini/commands/*.toml`
- [ ] **T3.5 — Leave `aidesigner.md` out**
  - It wraps the aidesigner MCP server, not a skill in this library. Stays a personal global command, untouched by the cutover in T6.2.
  - Acceptance: `aidesigner.md` is not in the repo and is explicitly listed as "keep local" in the cutover doc.
  - Verify: `ls .claude/commands/aidesigner.md` fails; cutover doc mentions it.

**Checkpoint 3:** every preference is in the repo. This is the phase to re-read carefully before moving on — it's the one that can silently lose work.

---

### Phase 4 — Harness manifests

- [ ] **T4.1 — Plugin identity + Claude manifests**
  - Pick the plugin name (drives T3.3's namespace). Proposal: `agent-skills` for familiarity, or a personal slug if you plan to publish alongside upstream.
  - Write `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` (source repo = `dzikrisyairozi/claude-multi-agent-dev` until a rename), root `plugin.json`.
  - Acceptance: `claude --plugin-dir .` loads the plugin; all 10 commands and 25 skills are listed.
  - Verify: launch Claude Code with `--plugin-dir .`, run `/help`, confirm the commands appear namespaced.
  - Files: `.claude-plugin/*`, `plugin.json`
- [ ] **T4.2 — Codex, Antigravity, OpenCode surfaces**
  - `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `.opencode/skills` → `../skills`.
  - Windows note: if the symlink can't be created, fall back to a copy and add a sync check to the validators; record which was used.
  - Acceptance: manifests are valid JSON with this repo's identity; `.opencode/skills` resolves to the skill set.
  - Verify: `node -e "JSON.parse(require('fs').readFileSync(f))"` per manifest; `ls .opencode/skills | wc -l` = 25.
  - Files: `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, `.opencode/skills`

**Checkpoint 4:** installable from a local clone in at least Claude Code, verified by actually installing it.

---

### Phase 5 — Personas, validators, docs

- [ ] **T5.1 — Port `agents/*.md`**
  - code-reviewer, security-auditor, test-engineer, web-performance-auditor.
  - Acceptance: 4 persona files; none of them invoke another persona (upstream's orchestration rule).
  - Verify: `grep -rn "Task(\|subagent" agents/` shows no persona-to-persona spawning.
  - Files: `agents/*.md`
- [ ] **T5.2 — Port the validators and make them pass**
  - `scripts/lib/skill-lint.js`, `validate-skills.js`, `validate-commands.js`, `validate-versions.js`, `validate-artifact-paths.js`, `validate-reference-links.js` (+ their `*-test.js`).
  - `validate-artifact-paths.js` likely asserts upstream's `SPEC.md`-at-root convention — adapt it to assert *our* `spec/<feature-name>/` + `tasks/<feature-name>/` convention instead of deleting the check.
  - Add `package.json` `scripts.validate` running them all.
  - Acceptance: `npm run validate` exits 0 with every validator run.
  - Verify: `npm run validate`.
  - Files: `scripts/**`, `package.json`
- [ ] **T5.3 — Docs**
  - Port `docs/*-setup.md` (claude/codex/cursor/gemini/opencode/windsurf/antigravity/copilot/commandcode), `skill-anatomy.md`, `getting-started.md`, `adoption-guide.md`; rewrite repo URLs, author, and install commands to point here.
  - Add a short `docs/cutover.md`: how this repo replaces the loose `~/.claude` files, and what stays local (`aidesigner.md`, private `CLAUDE.md`).
  - Acceptance: no doc references `addyosmani/agent-skills` as the install source (attribution as *upstream origin* stays — see T5.4).
  - Verify: `grep -rn "addyosmani" docs/ | grep -v "credit\|upstream\|based on"` is empty.
  - Files: `docs/**`
- [ ] **T5.4 — `README.md`, `AGENTS.md`, `CLAUDE.md`**
  - README: new purpose, the command table, install-per-harness, and an explicit upstream-credit line (MIT requires the license notice; crediting the source is also just correct).
  - `AGENTS.md`/`CLAUDE.md`: instructions for an agent *working on this repo* (how to add a skill, the three-surface command rule, run `npm run validate` before committing).
  - Acceptance: a fresh reader can install and use the repo from the README alone; LICENSE retains upstream's MIT notice where content is derived.
  - Verify: follow your own README on a clean clone in the scratchpad and install into Claude Code.
  - Files: `README.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`

**Checkpoint 5:** `npm run validate` green, docs accurate, repo self-describing.

---

### Phase 6 — Cutover (gated — each task asks first)

- [ ] **T6.1 — Smoke-test every command from the installed plugin**
  - Install from this repo, then fire `/spec`, `/plan`, `/build`, `/build auto` (dry), `/test`, `/review`, `/constraints`, `/ship`, `/webperf`, `/code-simplify`, `/quiz` in a scratch project.
  - Acceptance: each command resolves and still carries its preferences — check `/plan` mentions the benchmarks, `/build` refuses to commit on `main`, `/review` writes to `tasks/<f>/review/`.
  - Verify: manual run, recorded in the task notes.
- [ ] **T6.2 — Retire the loose `~/.claude` files (ASK FIRST)**
  - Back up `~/.claude/commands` and `~/.claude/skills` to a timestamped directory, then remove the files now provided by the plugin. Keep `aidesigner.md`, `graphify/`, and private `CLAUDE.md`/`RTK.md`.
  - Acceptance: no duplicate command definitions (loose file + plugin) shadowing each other; backup exists.
  - Verify: `/help` lists each command once; backup directory listed in the task notes.
- [ ] **T6.3 — Push and (optionally) rename (ASK FIRST)**
  - Push the branch, open a PR against `main`, and decide on the repo rename + description.
  - Acceptance: explicit go-ahead recorded before either action.

**Checkpoint 6:** old system retired only after the new one is proven.

## Risks

- **Silent preference loss in Phase 3** — the whole point of the overhaul. Mitigated by T3.1's grep-based acceptance checks on the exact benchmark strings.
- **Namespace mismatch** — commands invoking `<plugin>:<skill>` while the plugin is named something else fails silently at runtime (the skill just doesn't load). T4.1 must land before T3.3 is verified.
- **Windows symlink for `.opencode/skills`** — falls back to a copy; needs a sync check so the copy can't drift.
- **Duplicate commands during cutover** — a loose `~/.claude/commands/build.md` and the plugin's `build` both existing is the most likely post-install confusion. T6.2 exists for exactly this and runs only after T6.1 proves the plugin works.
