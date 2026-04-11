# Multi-Agent Development Workflow

This repository uses a multi-agent architecture. When the user gives a project prompt (e.g., "Create me a todo app"), follow this workflow.

## Entry Point

Use the `/start` slash command to kick off a new project. It validates the environment, then delegates to the `lead-engineer` agent.

## Environment

- Load `.env` for GitHub credentials and config.
- The GitHub repo specified by `GITHUB_OWNER` / `GITHUB_REPO` in `.env` is the target for all issues, branches, and PRs.
- The dashboard at `http://localhost:${DASHBOARD_PORT}` (default 3456) shows real-time orchestration. Start it with `./scripts/start-dashboard.sh`.

## Workflow Rules

1. **ALL coordination happens through GitHub** — issues and PRs are the shared memory between agents.
2. **NEVER write feature code in the lead-engineer agent** — always delegate via the `Task` tool.
3. **Every piece of work must have a GitHub issue** before code is written.
4. **Every code change must go through a PR**, never push directly to `main`.
5. **The lead-engineer is the ONLY agent that merges PRs.** Specialists cannot merge.
6. **If a ticket bounces back more than 3 times** from review, stop and ask the human.
7. **Always branch from the latest `main`**, never from another agent's in-progress branch.
8. **Hooks auto-emit events to the dashboard** — you don't need to do anything special, just work normally.

## GitHub Conventions

- **Branch naming:**
  - Features: `feat/issue-<number>-<short-slug>`
  - Fixes: `fix/issue-<number>-<short-slug>`
- **PR title:** `[#<issue-number>] <description>`
- **PR body:** must reference the issue with `Closes #<number>`
- **Labels:**
  - Agent: `agent:lead`, `agent:frontend`, `agent:backend`, `agent:uiux`, `agent:qa`
  - Status: `status:todo`, `status:in-progress`, `status:review`, `status:qa-testing`, `status:done`
- **Commit messages:** conventional commits — `feat(frontend): ...`, `fix(backend): ...`, `chore: ...`

## Stack decision (done at `/start` time)

Before any tickets are filed, the `/start` command decides the tech stack:

1. **If existing code is present** (`app/` has content, top-level `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `turbo.json`, etc.) — **continue with it**. Do not introduce new frameworks.
2. **If the repo is fresh** — ask the user:
   - **Default (option 1):** Next.js 14 (App Router) + TypeScript + Tailwind CSS as a **single full-stack app** under `app/`. Backend lives in `app/app/api/`. No frontend/backend split.
   - **Custom monorepo (option 2):** user picks frontend + backend (e.g. React + Rust, Next + Go, Vite + Python/FastAPI). Scaffold a **Turborepo** with `app/frontend/`, `app/backend/`, `app/shared/`.
   - **Other (option 3):** user describes something custom; confirm and proceed.
3. **Whatever the choice, the first ticket the Lead files is always `[chore] Scaffold <stack> project structure`** — and it blocks all feature tickets.

## Project Structure for Generated Apps

The layout depends on the stack mode:

**Default (Next.js single full-stack app):**
```
app/
├── app/            # Next.js App Router (pages + layouts)
│   └── api/        # API routes (backend lives here)
├── components/
├── lib/
├── styles/
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

**Turborepo monorepo (custom stacks):**
```
app/
├── frontend/       # chosen frontend framework
├── backend/        # chosen backend framework/language
├── shared/         # shared types, constants, contracts
├── turbo.json
├── package.json    # workspace root
└── pnpm-workspace.yaml (if pnpm)
```

The `app/` directory is gitignored by default so the template stays clean — remove the `app/` line from `.gitignore` in your target project if you want to commit the generated code.

## Styling

Frontend work **must use Tailwind CSS** unless the user explicitly requests otherwise. No CSS-in-JS, no `.module.css`, no inline styles beyond dynamic values.

## Dashboard Integration

Every agent action emits events to the dashboard server at `http://localhost:${DASHBOARD_PORT}/event` via the hooks configured in `.claude/settings.json`. The dashboard shows:

- Which agent is currently active
- What tool each agent is running right now
- A live edge animation when agents hand off work
- A ticket board showing issue states
- An activity log of the last ~200 events

You don't emit events manually — just work normally and the hooks capture everything.

## When in doubt

Read the agent files in `.claude/agents/` for detailed per-role instructions. The `lead-engineer.md` file is the authoritative source for orchestration behavior.
