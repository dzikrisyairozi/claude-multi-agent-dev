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

// ---------- config ----------
const PORT = Number(process.env.DASHBOARD_PORT || 3456);
const PUBLIC_DIR = path.resolve(__dirname, "public");
const MAX_LOG = 200;

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
  // Replay recent events to the new client
  try {
    ws.send(
      JSON.stringify({
        type: "__replay__",
        events: eventLog,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {}
});

// ---------- boot ----------
server.listen(PORT, () => {
  console.log(`\n  🟢 claude-multi-agent-dev · orchestration dashboard`);
  console.log(`     http://localhost:${PORT}`);
  console.log(`     POST /event  (hook sink)`);
  console.log(`     GET  /events (recent log)`);
  console.log(`     WS   ws://localhost:${PORT}`);
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
