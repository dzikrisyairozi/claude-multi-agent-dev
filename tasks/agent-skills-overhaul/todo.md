# Agent Skills Overhaul — Todo

Plan: `tasks/agent-skills-overhaul/plan.md` · Spec: `spec/agent-skills-overhaul/spec.md`

## Phase 0 — Baseline
- [ ] T0.1 Branch `chore/agent-skills-overhaul` off latest `main`
- [ ] T0.2 Decide whether `spec/` + `tasks/` are tracked in this repo (default: tracked)

## Phase 1 — Demolition
- [ ] T1.1 Delete dashboard, orchestration agents, hooks, shell scripts, `.env.example`, `.mcp.json`, old `CLAUDE.md`/`README.md`; trim `.claude/settings.json` + `package.json`

## Phase 2 — Skill library
- [ ] T2.1 Vendor upstream `skills/` v0.6.8 (25 skills, incl. `constraint-driven-development`)
- [ ] T2.2 Re-apply `spec/<feature-name>/spec.md` + `tasks/<feature-name>/{plan,todo}.md` conventions
- [ ] T2.3 Port `references/` (7 checklists)

## Phase 3 — Commands
- [ ] T3.1 Merge customized Claude commands (build, review, plan, spec, test as base; ship/code-simplify/webperf from upstream)
- [ ] T3.2 Add `/constraints`, carry `/quiz`
- [ ] T3.3 Namespace every skill invocation to the plugin name
- [ ] T3.4 Mirror all 10 commands to `commands/*.toml` + `.gemini/commands/*.toml`
- [ ] T3.5 Leave `aidesigner.md` out of the repo, note it in the cutover doc

## Phase 4 — Harness manifests
- [ ] T4.1 Plugin name + `.claude-plugin/{plugin,marketplace}.json` + root `plugin.json`; verify `claude --plugin-dir .`
- [ ] T4.2 `.codex-plugin/`, `.agents/plugins/marketplace.json`, `.opencode/skills` (symlink or copy+sync check)

## Phase 5 — Personas, validators, docs
- [ ] T5.1 Port `agents/*.md` (4 personas)
- [ ] T5.2 Port validators, adapt `validate-artifact-paths.js` to our path convention, `npm run validate` green
- [ ] T5.3 Port + rewrite `docs/`, add `docs/cutover.md`
- [ ] T5.4 Rewrite `README.md`, `AGENTS.md`, `CLAUDE.md`; keep upstream MIT credit

## Phase 6 — Cutover (gated)
- [ ] T6.1 Smoke-test all 11 commands from the installed plugin
- [ ] T6.2 **ASK FIRST** — back up and retire loose `~/.claude/commands` + `~/.claude/skills`
- [ ] T6.3 **ASK FIRST** — push branch / open PR / decide repo rename
