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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

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

  // Before computing the event, record lead → subagent dispatches so the
  // subagent's later hooks (which run in a separate process) can claim their
  // identity. Lead's Task PreToolUse is the only moment subagent_type is
  // directly visible.
  if (TYPE === "tool_start" && payload.tool_name === "Task") {
    recordPendingTask(payload.tool_input, extractProjectSlug(payload.transcript_path));
  }

  // Claude Code hook payload fields vary by hook type. Common ones:
  //   session_id, transcript_path, cwd, hook_event_name, tool_name,
  //   tool_input, tool_response. subagent_type is NOT in PreToolUse/PostToolUse
  //   payloads — we derive it from the transcript path (+ pending queue for
  //   worktree-isolated subagents).
  const event = {
    type: TYPE,
    agent: resolveAgent(payload),
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

// ---- shared state for lead ↔ worktree-subagent handoff ----
// Claude Code hooks for subagent tool calls do NOT include subagent_type.
// Two subagent shapes exist:
//   (a) non-worktree Task: transcript at <parent>/subagents/agent-<hash>.jsonl
//       with a sibling .meta.json containing { agentType }. Resolved directly.
//   (b) worktree-isolated Task: Claude Code treats the worktree as a new
//       project — transcript at projects/<worktree-slug>/<session>.jsonl,
//       no meta file. We can only learn the subagent_type at the lead's
//       Task PreToolUse (where tool_input.subagent_type is populated) and
//       pass that knowledge to the subagent process via a shared state file
//       under $HOME/.claude/ (reachable from any worktree without needing to
//       resolve git-common-dir on every hook call).
const STATE_DIR = join(homedir(), ".claude", "cmad-dashboard");
const STATE_PATH = join(STATE_DIR, "state.json");
const MAX_PENDING = 20;
const MAX_SESSIONS = 50;
const ENTRY_TTL_MS = 60 * 60 * 1000;

function loadState() {
  if (!existsSync(STATE_PATH)) return { pending: [], sessions: {} };
  try {
    const s = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return {
      pending: Array.isArray(s.pending) ? s.pending : [],
      sessions: s.sessions && typeof s.sessions === "object" ? s.sessions : {},
    };
  } catch {
    return { pending: [], sessions: {} };
  }
}

function saveState(state) {
  try {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    const now = Date.now();
    state.pending = state.pending.filter((e) => now - (e.ts || 0) < ENTRY_TTL_MS);
    while (state.pending.length > MAX_PENDING) state.pending.shift();
    const keep = Object.entries(state.sessions)
      .filter(([, v]) => now - (v.ts || 0) < ENTRY_TTL_MS)
      .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
    while (keep.length > MAX_SESSIONS) keep.shift();
    state.sessions = Object.fromEntries(keep);
    writeFileSync(STATE_PATH, JSON.stringify(state));
  } catch {}
}

function extractProjectSlug(transcriptPath) {
  if (typeof transcriptPath !== "string") return "";
  const m = transcriptPath.match(/projects[\\/]([^\\/]+)[\\/]/);
  return m ? m[1] : "";
}

function slugsRelated(a, b) {
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

function recordPendingTask(toolInput, projectSlug) {
  if (!toolInput || typeof toolInput !== "object") return;
  if (!toolInput.subagent_type) return;
  const state = loadState();
  state.pending.push({
    subagent_type: String(toolInput.subagent_type),
    description: toolInput.description ? String(toolInput.description) : "",
    project_slug: projectSlug || "",
    ts: Date.now(),
  });
  saveState(state);
}

function claimAgentForSession(sessionId, cwd, subagentSlug) {
  if (!sessionId) return null;
  const state = loadState();
  if (state.sessions[sessionId]) return state.sessions[sessionId].subagent_type;
  if (state.pending.length === 0) {
    saveState(state);
    return null;
  }
  const cwdLower = String(cwd || "").toLowerCase();
  const sameProject = (e) => !e.project_slug || !subagentSlug || slugsRelated(e.project_slug, subagentSlug);
  let idx = -1;
  for (let i = 0; i < state.pending.length; i++) {
    const e = state.pending[i];
    if (!sameProject(e)) continue;
    const slug = (e.description || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug && cwdLower.includes(slug)) {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    for (let i = 0; i < state.pending.length; i++) {
      if (sameProject(state.pending[i])) {
        idx = i;
        break;
      }
    }
  }
  if (idx === -1) idx = 0;
  const claimed = state.pending[idx];
  state.pending.splice(idx, 1);
  state.sessions[sessionId] = { subagent_type: claimed.subagent_type, ts: Date.now() };
  saveState(state);
  return claimed.subagent_type;
}

function resolveAgent(payload) {
  if (payload.subagent_type) return payload.subagent_type;
  if (payload.agent) return payload.agent;

  const tp = payload.transcript_path;
  const cwd = payload.cwd || "";

  // Case 1: non-worktree subagent (e.g. built-in Explore) — meta.json next to transcript
  if (typeof tp === "string" && /[\\/]subagents[\\/]/.test(tp)) {
    const metaPath = tp.replace(/\.jsonl$/i, ".meta.json");
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        if (meta && meta.agentType) return meta.agentType;
      } catch {}
    }
    return `subagent:${basename(tp).replace(/\.jsonl$/i, "")}`;
  }

  // Case 2: worktree-isolated subagent — slug contains "worktree" or cwd path does
  const slug = extractProjectSlug(tp);
  const inWorktree = /worktree/i.test(slug) || /[\\/]worktrees?[\\/]/i.test(cwd);
  if (inWorktree) {
    const claimed = claimAgentForSession(payload.session_id, cwd, slug);
    return claimed || "subagent";
  }

  return "lead-engineer";
}

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
