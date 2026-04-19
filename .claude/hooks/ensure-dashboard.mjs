#!/usr/bin/env node
// Ensure the orchestration dashboard is running.
//
// Wired up via the SessionStart hook in .claude/settings.json so the user
// never has to manually run `npm run dashboard`. Idempotent: if something
// already answers on DASHBOARD_PORT, this exits silently. Otherwise it
// spawns `node dashboard/server.js` detached and returns immediately so
// the Claude Code session is never blocked. All errors are swallowed;
// the hook must never break a session start.

import { existsSync, openSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const DASHBOARD_DIR = join(REPO_ROOT, "dashboard");

let PORT = 3456;
try {
  const envPath = join(REPO_ROOT, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*DASHBOARD_PORT\s*=\s*(.+?)\s*$/);
      if (m) {
        const n = Number(m[1].replace(/^["']|["']$/g, ""));
        if (n) PORT = n;
        break;
      }
    }
  }
} catch {}
if (process.env.DASHBOARD_PORT) PORT = Number(process.env.DASHBOARD_PORT) || PORT;

async function isUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/healthz`, {
      signal: AbortSignal.timeout(400),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ensureDeps() {
  if (existsSync(join(DASHBOARD_DIR, "node_modules"))) return true;
  try {
    const r = spawnSync(platform() === "win32" ? "npm.cmd" : "npm", ["install", "--silent"], {
      cwd: DASHBOARD_DIR,
      stdio: "ignore",
      timeout: 60_000,
      shell: platform() === "win32",
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

const PID_PATH = join(DASHBOARD_DIR, ".dashboard.pid");

function pidAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

// Advisory lock via O_EXCL file creation. Prevents a second SessionStart
// hook from racing into port-binding and crashing with EADDRINUSE when
// multiple Claude Code sessions start simultaneously.
function acquireStartLock() {
  try {
    writeFileSync(PID_PATH, String(process.pid), { flag: "wx" });
    return true;
  } catch {
    try {
      const existing = readFileSync(PID_PATH, "utf8").trim();
      if (existing && pidAlive(existing)) return false;
      unlinkSync(PID_PATH);
      writeFileSync(PID_PATH, String(process.pid), { flag: "wx" });
      return true;
    } catch {
      return false;
    }
  }
}

function startDetached() {
  try {
    const logPath = join(DASHBOARD_DIR, "dashboard.log");
    const logFd = openSync(logPath, "a");
    const child = spawn(process.execPath, ["server.js"], {
      cwd: DASHBOARD_DIR,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, DASHBOARD_PORT: String(PORT) },
      windowsHide: true,
    });
    if (child.pid) {
      try {
        writeFileSync(PID_PATH, String(child.pid));
      } catch {}
    }
    child.unref();
  } catch {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  if (await isUp()) process.exit(0);
  if (!existsSync(join(DASHBOARD_DIR, "server.js"))) process.exit(0);

  if (!acquireStartLock()) {
    // Another starter got here first. Give it a moment to bind, then recheck.
    await sleep(800);
    process.exit(0);
  }

  if (!ensureDeps()) process.exit(0);
  startDetached();
  process.exit(0);
})().catch(() => process.exit(0));
