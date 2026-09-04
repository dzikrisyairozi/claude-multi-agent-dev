---
description: Start spec-driven development — write a structured specification before writing code
---

Invoke the agent-skills:spec-driven-development skill.

Begin by understanding what the user wants to build. Ask clarifying questions about:
1. The objective and target users
2. Core features and acceptance criteria
3. Tech stack preferences and constraints
4. Known boundaries (what to always do, ask first about, and never do)

If code already exists in this area (not a greenfield project), ground the spec in it before writing anything down:
- Use `grep`/`git grep` for the exact symbols this feature touches — the verified-reliable default in this repo (measured 2026-08-07: beat graphify on both cost and accuracy for reference-finding).
- Use serena's `get_symbols_overview` / `find_symbol` on files this feature will touch, so acceptance criteria match current behavior, not guesses.
- graphify is optional for a rough architecture map (`graphify god-nodes`, `graphify explain`) — treat it as a lead to verify with grep, not a citable fact. It's been shown to conflate similarly-named symbols (e.g. a class and its lowercase singleton instance) and to pull in unrelated files through barrel-file re-exports.

Then generate a structured spec covering all six core areas: objective, commands, project structure, code style, testing strategy, and boundaries.

Save the spec to `spec/<feature-name>/spec.md` (create the directory if needed), then confirm with the user before proceeding. `<feature-name>` is a kebab-case slug reused across spec/plan/tasks for this feature; when the work has a GitHub issue, prefix it with the issue number — e.g. `spec/377-chat-surface-materials/spec.md`. Never write `SPEC.md` to the project root.
