#!/usr/bin/env bash
# Start the orchestration dashboard in the background.
#
# Usage:  bash scripts/start-dashboard.sh
# Stop:   bash scripts/start-dashboard.sh stop
#         (or: npm run dashboard:stop)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT/dashboard"

PID_FILE=".dashboard.pid"

# Load .env if present
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi
export DASHBOARD_PORT="${DASHBOARD_PORT:-3456}"

cmd="${1:-start}"

case "$cmd" in
  stop)
    if [ -f "$PID_FILE" ]; then
      PID="$(cat "$PID_FILE")"
      if kill "$PID" 2>/dev/null; then
        echo "  stopped dashboard (pid $PID)"
      else
        echo "  no running dashboard at pid $PID"
      fi
      rm -f "$PID_FILE"
    else
      echo "  no pid file — dashboard not running (or started externally)"
    fi
    exit 0
    ;;
  start|"") ;;
  *)
    echo "usage: $0 [start|stop]"
    exit 1
    ;;
esac

# Already running?
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "  dashboard already running (pid $(cat "$PID_FILE"))"
  echo "  http://localhost:$DASHBOARD_PORT"
  exit 0
fi

# Ensure deps
if [ ! -d node_modules ]; then
  echo "  installing dashboard dependencies..."
  npm install --silent
fi

echo "  starting orchestration dashboard on port $DASHBOARD_PORT"
nohup node server.js > dashboard.log 2>&1 &
PID=$!
echo "$PID" > "$PID_FILE"

# Give it a moment to boot
sleep 0.5

if ! kill -0 "$PID" 2>/dev/null; then
  echo "  ✗ dashboard failed to start — see dashboard/dashboard.log"
  rm -f "$PID_FILE"
  exit 1
fi

echo "  ✓ dashboard running (pid $PID)"
echo "  → http://localhost:$DASHBOARD_PORT"
echo "  logs: dashboard/dashboard.log"
echo "  stop: bash scripts/start-dashboard.sh stop"
