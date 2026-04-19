#!/usr/bin/env node
// Dashboard server for claude-multi-agent-dev.
//
// - Serves static files from ./public on DASHBOARD_PORT (default 3456)
// - Accepts POST /event from Claude Code hooks and broadcasts to WebSocket clients
// - GET /events returns the full in-memory event log (last 200) as JSON
// - GET /healthz returns { ok: true }
// - WebSocket on the same port; on connect, immediately replays the event log
//
// Zero build step. One dependency: `ws`.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer } = require("ws");

// ---------- .env loader (for GitHub credentials) ----------
function loadEnvFile() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  try {
    const out = {};
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}
const envFile = loadEnvFile();
const ENV = { ...envFile, ...process.env };

// ---------- config ----------
const PORT = Number(ENV.DASHBOARD_PORT || 3456);
const PUBLIC_DIR = path.resolve(__dirname, "public");
const MAX_LOG = 200;
const GITHUB_TOKEN = ENV.GITHUB_TOKEN || "";
const GITHUB_OWNER = ENV.GITHUB_OWNER || "";
const GITHUB_REPO = ENV.GITHUB_REPO || "";
const GITHUB_POLL_MS = Math.max(5000, Number(ENV.GITHUB_POLL_MS) || 10000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

// ---------- in-memory event log ----------
const eventLog = [];

function recordEvent(ev) {
  eventLog.push(ev);
  if (eventLog.length > MAX_LOG) eventLog.shift();
}

function broadcast(ev) {
  const payload = JSON.stringify(ev);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      try {
        client.send(payload);
      } catch {}
    }
  }
}

// ---------- static ----------
function safeJoin(root, rel) {
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

function serveStatic(res, absPath) {
  if (!absPath || !fs.existsSync(absPath)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  const stat = fs.statSync(absPath);
  if (stat.isDirectory()) {
    return serveStatic(res, path.join(absPath, "index.html"));
  }
  const ext = path.extname(absPath).toLowerCase();
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": "no-store",
  });
  fs.createReadStream(absPath).pipe(res);
}

// ---------- helpers ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 64 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function writeJSON(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body));
}

function tsPad(n) {
  return String(n).padStart(2, "0");
}
function nowStamp() {
  const d = new Date();
  return `${tsPad(d.getHours())}:${tsPad(d.getMinutes())}:${tsPad(d.getSeconds())}`;
}

function logEvent(ev) {
  const a = (ev.agent || "?").padEnd(18);
  const t = (ev.type || "?").padEnd(14);
  const detail = ev.tool || (ev.data && ev.data.summary) || "";
  console.log(`  [${nowStamp()}] ${a} ${t} ${detail}`);
}

// ---------- GitHub ticket polling ----------
// Reads GITHUB_TOKEN/OWNER/REPO from .env and polls /repos/:o/:r/issues every
// GITHUB_POLL_MS (default 10s). Issue state is derived from labels the
// orchestration workflow writes (status:todo|in-progress|review|qa-testing);
// closed issues map to "done". Pull-requests are filtered out — the dashboard
// tracks tickets, not PRs. Broadcasts `{ type: "__tickets__", tickets: [...] }`
// on every successful poll and serves GET /tickets for the initial snapshot.
let tickets = [];
let ticketsFetchedAt = null;
let githubBackoffUntil = 0;
let githubPollTimer = null;
let githubLoggedFirstSuccess = false;

function ticketStateFromIssue(issue) {
  if (issue.state === "closed") return "done";
  const labels = (issue.labels || []).map((l) =>
    (typeof l === "string" ? l : l && l.name ? l.name : "").toLowerCase(),
  );
  if (labels.includes("status:qa-testing")) return "qa-testing";
  if (labels.includes("status:review")) return "review";
  if (labels.includes("status:in-progress")) return "in-progress";
  if (labels.includes("status:todo")) return "todo";
  return "todo";
}

function shapeTicket(issue) {
  return {
    number: issue.number,
    title: issue.title || "",
    state: ticketStateFromIssue(issue),
    url: issue.html_url || "",
    updated_at: issue.updated_at || null,
    labels: (issue.labels || [])
      .map((l) => (typeof l === "string" ? l : l && l.name ? l.name : ""))
      .filter(Boolean),
  };
}

async function fetchGitHubTickets() {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return null;
  const now = Date.now();
  if (now < githubBackoffUntil) return null;

  const all = [];
  let page = 1;
  const perPage = 100;

  while (page <= 5) {
    const url =
      `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/` +
      `${encodeURIComponent(GITHUB_REPO)}/issues` +
      `?state=all&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "cmad-dashboard",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      const resetHeader = res.headers.get("x-ratelimit-reset");
      const resetMs = resetHeader ? Number(resetHeader) * 1000 : 0;
      const until = resetMs > Date.now() ? resetMs : Date.now() + 60_000;
      githubBackoffUntil = until;
      const secs = Math.round((until - Date.now()) / 1000);
      console.warn(`  github: ${res.status} — backing off ${secs}s`);
      return null;
    }
    if (!res.ok) {
      console.warn(`  github: HTTP ${res.status} — will retry next interval`);
      return null;
    }

    const body = await res.json();
    if (!Array.isArray(body)) break;
    for (const issue of body) {
      if (issue.pull_request) continue;
      all.push(shapeTicket(issue));
    }
    if (body.length < perPage) break;
    page += 1;
  }

  return all;
}

function ticketsChanged(a, b) {
  if (a.length !== b.length) return true;
  const key = (t) => `${t.number}|${t.state}|${t.title}|${t.updated_at}`;
  const aSet = new Set(a.map(key));
  for (const t of b) if (!aSet.has(key(t))) return true;
  return false;
}

async function pollGithubOnce() {
  try {
    const next = await fetchGitHubTickets();
    if (!next) return;
    if (!githubLoggedFirstSuccess) {
      console.log(`  github: first fetch OK (${next.length} tickets from ${GITHUB_OWNER}/${GITHUB_REPO})`);
      githubLoggedFirstSuccess = true;
    }
    if (ticketsChanged(tickets, next)) {
      tickets = next;
      ticketsFetchedAt = new Date().toISOString();
      broadcast({
        type: "__tickets__",
        tickets,
        timestamp: ticketsFetchedAt,
      });
    }
  } catch (err) {
    console.warn(`  github: poll error — ${err.message}`);
  }
}

function startGithubPolling() {
  if (!GITHUB_TOKEN) {
    console.log("  github: no GITHUB_TOKEN in .env — ticket polling disabled");
    return;
  }
  if (!GITHUB_OWNER || !GITHUB_REPO) {
    console.log("  github: GITHUB_OWNER / GITHUB_REPO missing — ticket polling disabled");
    return;
  }
  console.log(`  github: polling ${GITHUB_OWNER}/${GITHUB_REPO} every ${GITHUB_POLL_MS}ms`);
  // First poll after a short delay so server is fully up
  setTimeout(pollGithubOnce, 1000);
  githubPollTimer = setInterval(pollGithubOnce, GITHUB_POLL_MS);
  githubPollTimer.unref?.();
}

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path_ = url.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  try {
    // ---- API ----
    if (path_ === "/healthz") {
      writeJSON(res, 200, { ok: true, events: eventLog.length });
      return;
    }

    if (path_ === "/events" && req.method === "GET") {
      writeJSON(res, 200, eventLog);
      return;
    }

    if (path_ === "/tickets" && req.method === "GET") {
      writeJSON(res, 200, { tickets, fetched_at: ticketsFetchedAt });
      return;
    }

    if (path_ === "/event" && req.method === "POST") {
      const raw = await readBody(req);
      let ev;
      try {
        ev = JSON.parse(raw);
      } catch {
        writeJSON(res, 400, { error: "invalid json" });
        return;
      }
      // Normalize
      const normalized = {
        type: ev.type || "unknown",
        agent: ev.agent || "lead-engineer",
        tool: ev.tool || null,
        data: ev.data || null,
        tool_input_summary: ev.tool_input_summary || null,
        session_id: ev.session_id || null,
        timestamp: ev.timestamp || new Date().toISOString(),
      };
      recordEvent(normalized);
      broadcast(normalized);
      logEvent(normalized);
      writeJSON(res, 202, { ok: true });
      return;
    }

    // ---- static ----
    if (path_ === "/" || path_ === "") {
      serveStatic(res, path.join(PUBLIC_DIR, "index.html"));
      return;
    }
    serveStatic(res, safeJoin(PUBLIC_DIR, path_.replace(/^\//, "")));
  } catch (err) {
    console.error("request error:", err);
    writeJSON(res, 500, { error: err.message });
  }
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  // Replay recent events + current tickets to the new client
  try {
    ws.send(
      JSON.stringify({
        type: "__replay__",
        events: eventLog,
        timestamp: new Date().toISOString(),
      }),
    );
    if (tickets.length) {
      ws.send(
        JSON.stringify({
          type: "__tickets__",
          tickets,
          timestamp: ticketsFetchedAt || new Date().toISOString(),
        }),
      );
    }
  } catch {}
});

// ---------- boot ----------
server.listen(PORT, () => {
  console.log(`\n  🟢 claude-multi-agent-dev · orchestration dashboard`);
  console.log(`     http://localhost:${PORT}`);
  console.log(`     POST /event   (hook sink)`);
  console.log(`     GET  /events  (recent log)`);
  console.log(`     GET  /tickets (github snapshot)`);
  console.log(`     WS   ws://localhost:${PORT}`);
  startGithubPolling();
  console.log(`     (Ctrl+C to stop)\n`);
});

// Graceful shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`\n  stopping (${sig})`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  });
}
