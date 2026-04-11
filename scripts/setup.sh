#!/usr/bin/env bash
# claude-multi-agent-dev · one-command setup
#
# - Verifies prerequisites (node, git)
# - Ensures .env exists (copies from .env.example if missing)
# - Validates required env vars are set
# - Tests GitHub auth
# - Installs dashboard dependencies
# - Creates the required labels on the target GitHub repo
#
# Usage:  bash scripts/setup.sh

set -euo pipefail

# --------- pretty output ---------
c_reset="\033[0m"
c_bold="\033[1m"
c_dim="\033[2m"
c_red="\033[31m"
c_green="\033[32m"
c_yellow="\033[33m"
c_cyan="\033[36m"

ok()   { printf "  ${c_green}✓${c_reset} %s\n" "$1"; }
warn() { printf "  ${c_yellow}!${c_reset} %s\n" "$1"; }
err()  { printf "  ${c_red}✗${c_reset} %s\n" "$1"; }
step() { printf "\n${c_bold}${c_cyan}==>${c_reset} ${c_bold}%s${c_reset}\n" "$1"; }

# --------- locate repo root ---------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

printf "\n${c_bold}claude-multi-agent-dev · setup${c_reset}\n"

# --------- prerequisites ---------
step "checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  err "node not found — install Node.js 18+ from https://nodejs.org"
  exit 1
fi
NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "node >= 18 required, found $(node -v)"
  exit 1
fi
ok "node $(node -v)"

if ! command -v git >/dev/null 2>&1; then
  err "git not found"
  exit 1
fi
ok "git $(git --version | awk '{print $3}')"

if ! command -v curl >/dev/null 2>&1; then
  err "curl not found"
  exit 1
fi
ok "curl present"

if ! command -v docker >/dev/null 2>&1; then
  warn "docker not found — the GitHub MCP server uses Docker. Install it from https://docker.com before running /start."
else
  ok "docker $(docker --version | awk '{print $3}' | tr -d ,)"
fi

# --------- .env ---------
step "ensuring .env"

if [ ! -f .env ]; then
  if [ ! -f .env.example ]; then
    err ".env.example is missing — this repo is broken"
    exit 1
  fi
  cp .env.example .env
  ok "created .env from .env.example"
  warn "open .env and fill in GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, then re-run this script"
  printf "\n  ${c_dim}$REPO_ROOT/.env${c_reset}\n\n"
  exit 0
fi

# Load .env
set -a
# shellcheck disable=SC1091
source .env
set +a

missing=0
for var in GITHUB_TOKEN GITHUB_OWNER GITHUB_REPO; do
  val="${!var-}"
  if [ -z "${val}" ] || [ "${val}" = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ] || [ "${val}" = "your-github-username" ] || [ "${val}" = "your-repo-name" ]; then
    err "$var is missing or still a placeholder in .env"
    missing=1
  else
    ok "$var set"
  fi
done
if [ "$missing" -ne 0 ]; then
  exit 1
fi

DASHBOARD_PORT="${DASHBOARD_PORT:-3456}"

# --------- GitHub auth ---------
step "validating GitHub auth"
gh_user=$(curl -sS -H "Authorization: token $GITHUB_TOKEN" \
  -H "User-Agent: claude-multi-agent-dev/setup" \
  https://api.github.com/user | node -e '
    let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);if(j.login){console.log(j.login)}else{process.exit(2)}}catch{process.exit(2)}})
  ' || true)

if [ -z "$gh_user" ]; then
  err "GITHUB_TOKEN is invalid or has insufficient scopes. Needs: repo, project"
  exit 1
fi
ok "authenticated as $gh_user"

# Check repo exists
repo_status=$(curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "User-Agent: claude-multi-agent-dev/setup" \
  "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO")
if [ "$repo_status" != "200" ]; then
  err "cannot access $GITHUB_OWNER/$GITHUB_REPO (HTTP $repo_status). Check the name and token scopes."
  exit 1
fi
ok "repo $GITHUB_OWNER/$GITHUB_REPO accessible"

# --------- dashboard deps ---------
step "installing dashboard dependencies"
if [ ! -d dashboard/node_modules ]; then
  (cd dashboard && npm install --silent)
  ok "dashboard deps installed"
else
  ok "dashboard deps already present"
fi

# --------- labels ---------
step "ensuring GitHub labels"

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  # Try create; if it already exists (422), patch.
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "User-Agent: claude-multi-agent-dev/setup" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" \
    "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/labels")

  case "$code" in
    201) ok "created  $name" ;;
    422)
      curl -sS -o /dev/null \
        -X PATCH \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "User-Agent: claude-multi-agent-dev/setup" \
        -H "Content-Type: application/json" \
        -d "{\"new_name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" \
        "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/labels/$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$name")"
      ok "updated  $name"
      ;;
    *) err "label $name failed (HTTP $code)" ;;
  esac
}

create_label "agent:lead"       "f5b13d" "Engineering lead orchestrator"
create_label "agent:frontend"   "4cc9f0" "Frontend engineer"
create_label "agent:backend"    "a78bfa" "Backend engineer"
create_label "agent:uiux"       "f472b6" "UI/UX designer"
create_label "agent:qa"         "34d399" "QA engineer"
create_label "status:todo"          "6b7280" "Ready to pick up"
create_label "status:in-progress"   "3b82f6" "An agent is working on it"
create_label "status:review"        "f59e0b" "PR open, awaiting lead review"
create_label "status:qa-testing"    "10b981" "Under QA testing"
create_label "status:done"          "22c55e" "Merged and closed"

# --------- done ---------
step "all set"
cat <<EOF

  ${c_green}✓ setup complete${c_reset}

  next steps:

    1. start the dashboard
       ${c_dim}$${c_reset} bash scripts/start-dashboard.sh
       ${c_dim}→ http://localhost:$DASHBOARD_PORT${c_reset}

    2. start Claude Code in this directory
       ${c_dim}$${c_reset} claude

    3. run the /start command with your project idea
       ${c_dim}>${c_reset} /start Build me a todo app with auth and dark mode

  the lead-engineer will plan, file tickets, dispatch specialists, and merge.
  watch the whole thing light up on the dashboard.

EOF
