# claude-multi-agent-dev

A template repository that turns **Claude Code** into a multi-agent software development team.

You give it a prompt like *"Build me a todo app"* and it:

1. A **Lead Engineer** agent plans the project and files modular tickets on GitHub
2. Specialist sub-agents (**Frontend**, **Backend**, **UI/UX**, **QA**) pick up tickets, create branches, write code, and open PRs
3. Every PR gets reviewed by the Lead **and** browser-tested by QA via Playwright
4. The Lead merges green PRs; failing ones bounce back to the specialist with feedback
5. The loop continues until every issue is closed
6. A live local **orchestration dashboard** shows every agent's activity in real time

All coordination happens through **real GitHub issues, branches, and PRs** — so the workflow is inspectable, auditable, and the same way a human team works.

---

## Architecture

```
              ┌──────────────────┐
              │   Lead Engineer  │  (plans, reviews, merges)
              └──┬────┬────┬────┬┘
                 │    │    │    │
         ┌───────┘    │    │    └────────┐
         ▼            ▼    ▼             ▼
    ┌────────┐   ┌────────┐┌────────┐  ┌────────┐
    │  UI/UX │   │Frontend││Backend │  │   QA   │
    └───┬────┘   └───┬────┘└────┬───┘  └───┬────┘
        │            │          │          │
        └────────────┴────┬─────┴──────────┘
                          ▼
                     ┌─────────┐
                     │ GitHub  │ ← shared memory: issues, branches, PRs
                     └─────────┘
```

| Agent | Role |
|---|---|
| **lead-engineer** | Plans the project, files tickets, delegates, reviews PRs, merges. Never writes feature code. |
| **uiux-designer** | Produces detailed UI/UX specs (as issue comments) in Tailwind-class vocabulary so the frontend agent builds without guessing. |
| **frontend-engineer** | Implements UI tickets in **Tailwind CSS**. Creates branches, writes code, opens PRs. |
| **backend-engineer** | Implements APIs, schema, auth, migrations, business logic. Creates branches, opens PRs. |
| **qa-engineer** | Code-reviews every PR **and** drives a real browser via Playwright MCP. Returns PASS or FAIL with evidence. |

---

## Quick start

### 1. Clone and bootstrap

```bash
git clone <this-repo-url> my-new-project
cd my-new-project
bash scripts/setup.sh
```

On first run, `setup.sh` will:
- Verify Node 18+, git, curl, docker
- Copy `.env.example` → `.env` and ask you to fill it in
- Re-run it after editing `.env` to validate GitHub auth and create the required labels

### 2. Fill in `.env`

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
DASHBOARD_PORT=3456
```

The token needs **`repo`** and **`project`** scopes. Create one at https://github.com/settings/tokens.

### 3. Start the dashboard

```bash
bash scripts/start-dashboard.sh
```

Open **http://localhost:3456** in your browser. You'll see the agent graph, a connection indicator (green = connected), an activity log, and a ticket board.

### 4. Start Claude Code and kick off a project

```bash
claude
```

Then in the Claude Code session:

```
/start Build me a todo app with email+password auth, dark mode, and a daily streak counter
```

Watch the dashboard come alive as the Lead plans, files tickets, dispatches specialists, and merges PRs.

---

## Repository layout

```
claude-multi-agent-dev/
├── .claude/
│   ├── settings.json          # Hooks that emit events to the dashboard
│   ├── hooks/emit.mjs         # Hook sink — POSTs events to localhost:3456/event
│   ├── commands/start.md      # The /start slash command
│   └── agents/
│       ├── lead-engineer.md
│       ├── frontend-engineer.md
│       ├── backend-engineer.md
│       ├── uiux-designer.md
│       └── qa-engineer.md
├── .mcp.json                  # GitHub (docker) + Playwright MCP servers
├── .env.example               # Config template
├── .gitignore
├── CLAUDE.md                  # Project-level instructions Claude Code reads automatically
├── README.md                  # This file
├── package.json               # Root scripts: setup, dashboard
├── dashboard/
│   ├── server.js              # Node.js HTTP + WebSocket server
│   ├── public/index.html      # Single-file dashboard UI (no build step)
│   └── package.json           # One dep: ws
└── scripts/
    ├── setup.sh               # One-command setup
    ├── start-dashboard.sh     # Start/stop the dashboard
    └── install-into.sh        # Install orchestration into an existing repo
```

When the agents start building, application code goes into `app/`:

```
app/
├── frontend/   # React / Next.js / Electron renderer / etc. — Tailwind CSS
├── backend/    # API routes, schema, business logic
└── shared/     # Shared types, constants, utils
```

`app/` is gitignored in the template so the template stays clean. Remove that line from `.gitignore` in your target project if you want to commit generated code.

---

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | yes | Personal access token with `repo` + `project` scopes. Used by the GitHub MCP, setup script, and dashboard. |
| `GITHUB_OWNER` | yes | Target repo owner (user or org). |
| `GITHUB_REPO` | yes | Target repo name. |
| `DASHBOARD_PORT` | no | Port for the local dashboard. Default: `3456`. |

---

## How it works under the hood

### Sub-agents
Each agent is a Markdown file with YAML frontmatter in `.claude/agents/`. The frontmatter declares the agent's tool allowlist (including which MCP tools it can use). The body is the system prompt.

The Lead is the main Claude session. It invokes specialists via the `Task` tool, passing a self-contained brief with the issue number, acceptance criteria, branch name, and base branch.

### MCP servers (`.mcp.json`)
- **github** — the official GitHub MCP server from `ghcr.io/github/github-mcp-server` (runs via Docker)
- **playwright** — `@playwright/mcp@latest` for QA browser testing

### Hooks (`.claude/settings.json`)
Claude Code fires hooks on `PreToolUse`, `PostToolUse`, `SubagentStop`, `UserPromptSubmit`, and `Stop`. Each hook invokes `node .claude/hooks/emit.mjs <type>`, which reads the Claude-provided JSON payload from stdin, normalizes it, and POSTs it to `http://localhost:$DASHBOARD_PORT/event`. If the dashboard is down, the hook silently fails — it never blocks the agent.

### Dashboard (`dashboard/`)
- `server.js` — minimal HTTP + WebSocket server (only dependency: `ws`). Receives POSTs on `/event`, keeps an in-memory log of the last 200 events, broadcasts to all connected WebSocket clients, and serves the static HTML from `public/`.
- `public/index.html` — single-file dashboard with dark theme, SVG agent graph, activity log, and ticket board. Auto-reconnects the WebSocket with exponential backoff. Zero build step.

---

## Customization

### Modify an agent
Edit `.claude/agents/<agent>.md`. The `tools:` field in the frontmatter controls the allowlist — use commas. The body is the system prompt. Changes take effect on the next `claude` session.

### Add a new agent
1. Create `.claude/agents/<new-agent>.md` with frontmatter + prompt
2. Reference the new agent in `lead-engineer.md` so the Lead knows when to delegate to it
3. Optionally add its color/position in `dashboard/public/index.html` (in the `AGENTS` array) so it shows up on the graph

### Change the project stack
The agents detect the stack from `package.json` and adapt. To prefer a specific stack, edit the relevant agent's system prompt to pin the framework. For example, "always use Next.js 14 with the app router."

### Change GitHub conventions
The branch naming, label names, and commit style are defined in `CLAUDE.md` and each agent file. Update them together.

### Install into an existing repo

If you already have a working project and want to add the orchestration layer to it:

```bash
# From the template directory, run:
bash scripts/install-into.sh /path/to/your/existing/project

# Then in your existing project:
# 1. Add the env vars it tells you to your .env
# 2. bash scripts/setup.sh
# 3. bash scripts/start-dashboard.sh
# 4. claude → /start <what you want to build>
```

The installer:
- **Copies** agents, commands, hooks, dashboard, and scripts (new files only)
- **Merges** `.mcp.json` — preserves your existing MCP servers, adds `github` + `playwright`
- **Merges** `.claude/settings.json` — preserves your existing hooks, adds dashboard emitters
- **Adds** `orchestration:*` scripts to your existing `package.json` without touching anything else
- **Appends** an orchestration workflow section to your existing `CLAUDE.md`
- **Backs up** every modified file to `.orchestration-backup-<timestamp>/`
- Is **idempotent** — safe to re-run; already-installed files are skipped

If a file it needs to copy already exists and differs from the template, it stops with a conflict error. Use `--force` to overwrite (a backup is always saved first).

---

## Troubleshooting

**"GITHUB_TOKEN is invalid or has insufficient scopes"** — Regenerate a token with `repo` + `project` scopes. Update `.env`. Re-run `scripts/setup.sh`.

**Dashboard shows "disconnected"** — The dashboard isn't running, or it's on a different port. Check `bash scripts/start-dashboard.sh` and `DASHBOARD_PORT` in `.env`.

**Hooks aren't appearing on the dashboard** — Hooks only fire when the dashboard is already running. Start the dashboard first, then run Claude Code. Hooks silently fail if the dashboard is down (by design — so a missing dashboard never blocks your agents).

**GitHub MCP fails to start** — The GitHub MCP runs via Docker. Make sure Docker Desktop is running and you've authenticated: `docker run --rm hello-world`.

**Playwright MCP can't find an element** — QA will flag missing `data-testid`s and fail the PR with a specific note. Frontend engineer should add the missing testids and push again.

**Agent keeps failing the same ticket** — The Lead stops after 3 retries and escalates to you. Read the last review comments and decide whether to amend the ticket or unstick the agent manually.

**GitHub Actions / protected `main`** — If `main` is protected, the Lead needs the token to have permission to bypass required checks, or you need to loosen the rules. Alternatively, change the base branch in the agent files to something like `develop`.

---

## What the template does NOT do

- **It does not run CI.** Hook up your own GitHub Actions — the agents will respond to review comments from any reviewer, including bots.
- **It does not deploy anything.** That's intentional — deploys are too destructive for unattended agents.
- **It does not stop between tickets.** The Lead autonomously merges any PR that passes both its own review and QA, then immediately picks up the next ticket. The only automatic human gates are (a) a ticket bouncing back 3 times from review, (b) an ambiguous stack decision at `/start` time, and (c) completion of every issue in the milestone. If you want a pause before every merge, edit `lead-engineer.md` Phase 2 step 9 to require human confirmation.

---

## License

MIT.
