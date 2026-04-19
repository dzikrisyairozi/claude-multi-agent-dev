---
description: Kick off the multi-agent development workflow for a new project
argument-hint: <what you want to build>
---

You are initiating a multi-agent software development workflow.

The user's project request is: **$ARGUMENTS**

Execute this sequence carefully. Do not skip any step.

## Step 1 — Verify setup

1. Confirm `.env` exists at the repo root. If not, tell the user to copy `.env.example` to `.env` and fill it in, then stop.
2. Load `.env` and confirm `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` are all set to non-empty values. If any are missing, tell the user and stop.
3. Verify GitHub authentication works by calling `mcp__github__get_me` (or listing the target repo). If it fails, report the error and stop.
4. Check if the dashboard is running at `http://localhost:${DASHBOARD_PORT:-3456}` by doing a quick fetch with Bash (`curl -sf http://localhost:3456/events >/dev/null`). If not, suggest the user run:
   ```bash
   ./scripts/start-dashboard.sh
   ```
   Do not block — continue even if the dashboard is down, but warn the user they won't see the visualization.
5. Ensure the required GitHub labels exist on `$GITHUB_OWNER/$GITHUB_REPO`. The full list is:
   - `agent:lead` (color `f5b13d`)
   - `agent:frontend` (color `4cc9f0`)
   - `agent:backend` (color `a78bfa`)
   - `agent:uiux` (color `f472b6`)
   - `agent:qa` (color `34d399`)
   - `status:todo` (color `6b7280`)
   - `status:in-progress` (color `3b82f6`)
   - `status:review` (color `f59e0b`)
   - `status:qa-testing` (color `10b981`)
   - `status:done` (color `22c55e`)

   Create any that are missing via the github MCP. If `scripts/setup.sh` has already been run, all labels should exist.

## Step 2 — Detect or choose the tech stack

Before planning, determine the stack. Follow this decision tree:

### 2a. Check for existing code

Look for any of these at the repo root:
- `app/` directory with content
- Top-level `package.json`
- `Cargo.toml`, `go.mod`, `pyproject.toml`, `composer.json`, `Gemfile`
- `turbo.json` or `pnpm-workspace.yaml`

**If existing code is detected:**
1. Inspect it briefly — read the relevant manifest(s) to identify frameworks, package manager, and structure (single app vs. monorepo).
2. Report to the user what you found, e.g.:
   > "I see an existing Next.js + TypeScript project in `app/frontend/`. I'll continue with this stack."
3. Skip to Step 3. Do NOT ask about stack preferences and do NOT introduce new frameworks.

### 2b. Greenfield — ask the user

If there is no existing code, ask exactly this:

> **"This is a fresh repo. What stack would you like?**
>
> **1. Default:** Next.js 14 (App Router) + TypeScript + Tailwind CSS — single full-stack app in `app/`. Fastest to ship, best for typical web apps.
> **2. Custom monorepo:** pick your own frontend and backend (e.g. React + Rust, Next + Go, Vite + Python/FastAPI). I'll scaffold a Turborepo monorepo with `app/frontend/` and `app/backend/`.
> **3. Something else:** describe it in one line.
>
> **Press Enter or reply `1` for the default.**"

Wait for the user's answer.

### 2c. Scaffold the stack

Based on the answer:

**Option 1 (default) — Next.js + TypeScript + Tailwind single app:**
- Structure: `app/` is a single Next.js 14 project (not `app/frontend/` + `app/backend/`)
- `app/app/` for routes (Next App Router), `app/app/api/` for backend routes
- `app/components/`, `app/lib/`, `app/styles/globals.css`
- `tailwind.config.ts`, `tsconfig.json`, `package.json` inside `app/`
- The Lead may scaffold this directly (it's configuration, not feature code), OR file a `chore: scaffold project` ticket and let `frontend-engineer` do it. Prefer the latter for auditability.

**Option 2 — Turborepo monorepo:**
- Root: `app/` contains `turbo.json`, root `package.json` with workspaces, `pnpm-workspace.yaml` if pnpm
- `app/frontend/` — the user's chosen frontend framework
- `app/backend/` — the user's chosen backend (TypeScript, Rust, Go, Python — whatever they picked)
- `app/shared/` — shared types (typed client on the backend language if possible, or via OpenAPI/protobuf)
- The `backend-engineer` agent adapts to the chosen backend language
- File a `chore: scaffold monorepo` ticket first

**Option 3 — described by user:**
- Restate what they said back to them in one line
- Ask for confirmation before proceeding
- Then treat as Option 2 structurally (monorepo) unless it's obviously a single-app stack

### 2d. Record the decision

Post a pinned comment (or create issue #1 as `[chore] Project stack`) documenting the chosen stack so all sub-agents read it before working. Include:

- Frontend framework and language
- Backend framework and language (or "same as frontend" for Option 1)
- Package manager
- Repo structure (single app vs monorepo)
- Styling: always **Tailwind CSS** unless the user said otherwise

## Step 3 — Delegate to the Lead Engineer

Invoke the `lead-engineer` subagent via the `Task` tool with this brief:

```
The user wants to build: $ARGUMENTS

Target repository: <GITHUB_OWNER>/<GITHUB_REPO>

Stack decision (from Step 2):
  - Mode: <existing | default-nextjs | custom-monorepo | other>
  - Frontend: <framework + language>
  - Backend: <framework + language, or "same as frontend">
  - Structure: <single-app under app/ | turborepo under app/>
  - Package manager: <npm | pnpm | yarn | bun>

Follow your system prompt exactly:
1. Plan the project and decompose it into modular GitHub issues with detailed descriptions and acceptance criteria.
2. If the repo is empty for the chosen stack, the FIRST ticket must be "chore: scaffold <stack> project structure" and dispatched before any feature work.
3. Create the issues via the github MCP, labeled with the correct agent:* and status:todo labels.
4. Orchestrate the team to build each issue by delegating to frontend-engineer, backend-engineer, uiux-designer, and qa-engineer as appropriate. **Every Task call MUST pass `isolation: "worktree"`** so sub-agents don't pollute the main session's working directory.
5. Before each delegation, `git checkout main && git pull origin main` in the main session so new worktrees start from the latest main.
6. Review every PR yourself AND delegate to qa-engineer before merging.
7. **Do NOT yield back to the user between tickets.** Keep looping through Phase 2 until every open issue in the milestone is either closed or blocked on a 3-retry escalation.
8. Stop and report to the human ONLY if: (a) a ticket bounces back from review 3 times, (b) the stack decision is ambiguous, or (c) the milestone is fully complete.
```

## Step 4 — Report

After the Lead Engineer returns (or pauses for human input), summarize what happened:

- How many issues were created
- Which PRs were opened, reviewed, merged
- Any blockers or open questions
- What the user should do next
