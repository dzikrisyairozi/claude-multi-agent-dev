#!/usr/bin/env node
// Hook emitter — POSTs a structured event to the local dashboard server.
//
// Invoked by Claude Code hooks defined in .claude/settings.json. Claude Code
// pipes a JSON payload to stdin describing the event (session_id, tool_name,
// subagent, etc). We normalize that into a flat event shape the dashboard
// server expects and POST it to /event.
//
// Usage (from settings.json):
//   node .claude/hooks/emit.mjs <type>
//
// This script MUST never throw — a failing hook must not block the agent.
// All errors are swallowed and the process always exits 0.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TYPE = process.argv[2] || "unknown";

// -------- load .env (only DASHBOARD_PORT matters here) --------
function loadEnv() {
  const envPath = resolve(__dirname, "..", "..", ".env");
  if (!existsSync(envPath)) return {};
  try {
    const out = {};
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
const PORT = Number(env.DASHBOARD_PORT || 3456);

// -------- read stdin (hook payload) --------
async function readStdin() {
  if (process.stdin.isTTY) return "";
  return new Promise((res) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => res(data));
    // Safety timeout — never hang
    setTimeout(() => res(data), 300);
  });
}

function safeParse(s) {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// -------- main --------
(async () => {
  const rawStdin = await readStdin();
  const payload = safeParse(rawStdin) || {};

  // Claude Code hook payload fields vary by hook type. Common ones:
  //   session_id, cwd, hook_event_name, tool_name, tool_input, tool_response,
  //   subagent_type, prompt
  const event = {
    type: TYPE,
    agent: payload.subagent_type || payload.agent || "lead-engineer",
    tool: payload.tool_name || null,
    tool_input_summary: summarizeToolInput(payload.tool_input),
    session_id: payload.session_id || null,
    hook_event: payload.hook_event_name || null,
    cwd: payload.cwd || process.cwd(),
    timestamp: new Date().toISOString(),
  };

  await postEvent(event);
  process.exit(0);
})().catch(() => {
  // Never let a logging error break a tool call
  process.exit(0);
});

function summarizeToolInput(input) {
  if (!input || typeof input !== "object") return null;
  // Small, bounded preview for the dashboard
  const keys = ["file_path", "command", "pattern", "path", "url", "description"];
  const out = {};
  for (const k of keys) if (input[k] != null) out[k] = String(input[k]).slice(0, 120);
  return Object.keys(out).length ? out : null;
}

async function postEvent(event) {
  try {
    const body = JSON.stringify(event);
    const res = await fetch(`http://localhost:${PORT}/event`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      // Short timeout — if the dashboard is down, do not block
      signal: AbortSignal.timeout(600),
    });
    // Consume response to avoid socket warnings
    if (res && res.body) {
      try { await res.text(); } catch {}
    }
  } catch {
    // Dashboard not running — silently ignore
  }
}
