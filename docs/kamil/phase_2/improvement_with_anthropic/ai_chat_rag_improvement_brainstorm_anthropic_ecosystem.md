# AI Chat & RAG Improvement Brainstorm — Anthropic Ecosystem

> Comprehensive exploration of migrating the AI Chat and RAG system from OpenAI to the Anthropic ecosystem, primarily using the Claude Agent SDK.
>
> Generated: 2026-02-17
>
> Companion to: `ai_chat_rag_improvement_brainstorm.md` (OpenAI-focused)

---

## Table of Contents

- [A. Architecture: Agent SDK vs Direct API](#a-architecture-agent-sdk-vs-direct-api)
- [B. File Processing with Claude Native Vision](#b-file-processing-with-claude-native-vision)
- [C. Embedding Migration: Voyage AI](#c-embedding-migration-voyage-ai)
- [D. Custom Tools via MCP Servers](#d-custom-tools-via-mcp-servers)
- [E. Agent Loop vs Two-Pass Orchestration](#e-agent-loop-vs-two-pass-orchestration)
- [F. Streaming Architecture](#f-streaming-architecture)
- [G. Session Management & Conversation Persistence](#g-session-management--conversation-persistence)
- [H. System Prompt Engineering (Anthropic-Specific)](#h-system-prompt-engineering-anthropic-specific)
- [I. Dual-Layer Content Model (ai_judgment)](#i-dual-layer-content-model-ai_judgment)
- [J. RAG Reliability Improvements](#j-rag-reliability-improvements)
- [K. Reliability & Error Handling](#k-reliability--error-handling)
- [L. Implementation Priority & Migration Roadmap](#l-implementation-priority--migration-roadmap)
- [M. Subagents for Parallel Workflows](#m-subagents-for-parallel-workflows)
- [N. Skills: Packaging Domain Workflows](#n-skills-packaging-domain-workflows)
- [O. Hosting & Deployment](#o-hosting--deployment)
- [P. Structured Outputs](#p-structured-outputs)

---

## A. Architecture: Agent SDK vs Direct API

### Current State

The system uses raw `fetch()` to OpenAI's REST API — no SDK. Two endpoints:
- `POST https://api.openai.com/v1/chat/completions` (chat, in `src/app/api/openai/respond/utils/openai-client.ts`)
- `POST https://api.openai.com/v1/embeddings` (embeddings, in `src/service/rag/triggerEmbeddings.ts`)

Manual two-pass orchestration: 1st call decides tools (non-streaming), execute tools, 2nd call synthesizes (streaming with `tool_choice: "none"`).

### Two Migration Paths

#### Path 1: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)

The Agent SDK wraps the Claude API with a **full agent loop**, built-in tool execution, and streaming — the same engine that powers Claude Code.

```bash
npm install @anthropic-ai/claude-agent-sdk
```

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define custom tools as MCP server (see Section D)
const ebFilemgServer = createSdkMcpServer({
  name: "eb-filemg",
  version: "1.0.0",
  tools: [searchDocumentsTool, manageDocumentsTool, manageFoldersTool, approvalRequestsTool],
});

// Single query() call replaces entire two-pass orchestration
for await (const message of query({
  prompt: userMessage,
  options: {
    systemPrompt: SYSTEM_PROMPT,
    mcpServers: { "eb-filemg": ebFilemgServer },
    allowedTools: [
      "mcp__eb-filemg__search_user_documents",
      "mcp__eb-filemg__manage_documents",
      "mcp__eb-filemg__manage_folders",
      "mcp__eb-filemg__manage_approval_requests",
    ],
    model: "claude-sonnet-4-5-20250929",
    maxTurns: 5,
    includePartialMessages: true,
  },
})) {
  // Stream messages to frontend via SSE
  if (message.type === "assistant") {
    // Claude's reasoning and tool calls
  } else if (message.type === "stream_event") {
    // Real-time text deltas (when includePartialMessages: true)
  } else if (message.type === "result") {
    // Final result
  }
}
```

**Advantages:**
- Eliminates manual two-pass orchestration — the agent loop is built-in
- Multi-step tool calls happen automatically (solves the brainstorm Section M problem for free)
- Custom tools via MCP servers with Zod-typed schemas
- Subagents for parallel operations (multi-file processing)
- Hooks for lifecycle events (PreToolUse validation, PostToolUse logging)
- Session management with resume/fork
- `maxTurns` prevents infinite loops, `maxBudgetUsd` prevents runaway costs
- Built-in AbortController support

**Considerations:**
- The Agent SDK spawns a subprocess under the hood — potential latency overhead for web requests
- Originally designed for code-editing agents (file system tools); we'd use custom MCP tools instead
- Newer SDK — less battle-tested than the standard Anthropic client SDK
- The streaming model is different from raw SSE (AsyncGenerator of typed messages vs raw SSE events)
- Requires `ANTHROPIC_API_KEY` environment variable

#### Path 2: Standard Anthropic SDK (`@anthropic-ai/sdk`)

The standard SDK provides direct access to the Messages API. You implement the tool loop yourself — similar to the current OpenAI pattern.

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// First call: tool selection
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 2048,
  system: SYSTEM_PROMPT,
  tools: getToolsDefinitions(), // Same tools, Anthropic format
  messages: conversationMessages,
});

if (response.stop_reason === "tool_use") {
  // Extract tool_use blocks
  const toolUses = response.content.filter(block => block.type === "tool_use");

  // Execute tools (same handlers as before)
  const toolResults = await executeTools(toolUses);

  // Second call: synthesis with streaming
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: getToolsDefinitions(),
    messages: [
      ...conversationMessages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults.map(r => ({
        type: "tool_result",
        tool_use_id: r.tool_use_id,
        content: JSON.stringify(r.result),
      }))},
    ],
  });

  // Stream to frontend
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      // Send SSE event to frontend
    }
  }
}
```

**Advantages:**
- Full control over the tool loop — same mental model as current code
- Lighter weight — no subprocess, direct API calls
- Mature SDK, well-documented
- Easier to reason about latency and error handling
- Can implement multi-step retrieval manually (like the current architecture with small modifications)

**Considerations:**
- Must implement the tool loop manually (but it's straightforward)
- No built-in session management (continue using Supabase messages)
- No hooks or subagents (implement validation/logging inline)

### Comparison Table

| Aspect | Agent SDK | Standard SDK |
|--------|-----------|-------------|
| **Setup complexity** | Higher (MCP servers, options) | Lower (direct API calls) |
| **Agent loop** | Built-in (automatic multi-step) | Manual implementation |
| **Tool definitions** | MCP format (Zod schemas) | Anthropic format (JSON Schema) |
| **Streaming** | AsyncGenerator<SDKMessage> | SSE events via `.stream()` |
| **Multi-step retrieval** | Free (agent loop handles it) | Manual loop needed |
| **Latency overhead** | Higher (subprocess) | Lower (direct HTTP) |
| **Error handling** | Hooks + built-in retries | Manual try/catch |
| **Session persistence** | Built-in (resume/fork) | Manual (Supabase) |
| **Maturity** | Newer | Production-proven |
| **Control** | Opinionated | Full flexibility |

### Agent SDK Input Modes

The Agent SDK supports two distinct input modes, each with different capabilities and trade-offs for Next.js integration:

#### Streaming Input Mode (Default, Recommended)

A persistent, interactive session where `prompt` is an `AsyncGenerator`/`AsyncIterable`. The agent operates as a long-lived process.

```typescript
// Streaming input: prompt is an async generator
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: "Analyze the uploaded invoice"
    }
  };

  // Can yield more messages later (queued processing)
  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: [
        { type: "text", text: "Now check this receipt image" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } }
      ]
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),  // AsyncGenerator
  options: { maxTurns: 10, allowedTools: ["Read", "Grep", "Task"], mcpServers: { ... } }
})) {
  // Full capabilities: images, hooks, multi-turn, MCP tools
}
```

**Capabilities**: Image uploads, queued messages, real-time interruption, full tool/MCP access, hooks support, streaming responses, context persistence across turns.

**Implication for Next.js**: Requires a long-lived connection (WebSocket or long-polling), not compatible with standard serverless API routes that have 10-30s timeouts. Would need a separate containerized deployment or Vercel Sandbox (see Section O).

#### Single Message Input Mode

Simpler, one-shot mode where `prompt` is a plain `string`.

```typescript
// Single message: prompt is a string
for await (const message of query({
  prompt: "Explain the authentication flow in this project",
  options: { maxTurns: 1, allowedTools: ["Read", "Grep"] }
})) {
  if (message.type === "result") console.log(message.result);
}

// Continue with session state (subsequent call)
for await (const message of query({
  prompt: "Now explain the authorization process",
  options: { continue: true, maxTurns: 1 }
})) {
  if (message.type === "result") console.log(message.result);
}
```

**Limitations**: No image attachments, no dynamic message queueing, no real-time interruption, no hooks, no natural multi-turn within a single `query()` call.

**Implication for Next.js**: Works with serverless API routes — each request is a single `query()` call. Use `continue: true` or `resume: sessionId` to chain stateless calls across requests.

#### Which Mode for EB-FILEMG?

| Scenario | Recommended Mode | Reason |
|----------|-----------------|--------|
| Chat API route (user-facing) | Single message | Serverless-compatible, lower latency |
| File ingestion with ai_judgment | Single message | One-shot classification per file |
| Multi-file batch processing | Streaming input | Need queued messages, images, long-running |
| Interactive document analysis | Streaming input | Multi-turn with image attachments |

**Hybrid approach**: Single message mode for the Next.js API route (chat), streaming input mode for background tasks (batch ingestion, complex document analysis) running in a container or Vercel Sandbox.

### Recommendation Assessment

For a **demo-focused web application** with a Next.js API route:

**If speed of development matters most** → Agent SDK. The built-in agent loop and multi-step retrieval eliminate significant orchestration code. The `query()` function replaces ~150 lines of two-pass logic.

**If production reliability matters most** → Standard SDK. Direct API calls, full control, lower latency, battle-tested. The manual tool loop is only ~50 lines of code.

**Hybrid approach** (worth exploring): Use the standard SDK for the chat API route (latency-sensitive, user-facing), and the Agent SDK for background tasks (file ingestion with ai_judgment, batch processing via subagents).

---

## B. File Processing with Claude Native Vision

### Key Difference from OpenAI

With OpenAI, image analysis requires a separate API call to a vision-capable model (gpt-4.1-mini with `image_url` content type). With Claude, **vision is native to ALL models** — Opus, Sonnet, and Haiku all understand images. No separate endpoint, no model switch.

### Image Text Extraction

When an image is uploaded, convert to base64 and send as an `image` content block:

```typescript
// Using Standard Anthropic SDK
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const extractTextFromImage = async (buffer: Buffer, mimeType: string, fileName: string) => {
  const base64 = buffer.toString("base64");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001", // Cheapest, still has vision
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        },
        {
          type: "text",
          text: `Extract ALL text content from this image (${fileName}). Include:
- Any visible text, numbers, dates, amounts
- Table/grid data (format as structured text)
- Labels, headers, footers
- Handwritten text if readable
Return the extracted text only, no commentary.`,
        },
      ],
    }],
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
};
```

### Supported Image Formats

| Format | MIME Type | Supported |
|--------|-----------|-----------|
| JPEG | `image/jpeg` | Yes |
| PNG | `image/png` | Yes |
| GIF | `image/gif` | Yes |
| WebP | `image/webp` | Yes |
| HEIC | `image/heic` | No — convert to JPEG first |
| TIFF | `image/tiff` | No — convert to PNG first |

**Limits:**
- Max 5MB per image (API), 10MB (claude.ai)
- Max 100 images per API request
- Images larger than 8000x8000 px are rejected
- Optimal: resize to max 1568px on longest edge before sending

### Cost Comparison

| Provider | Model | Cost per Image (~1000x1000px) | Speed |
|----------|-------|------------------------------|-------|
| OpenAI | gpt-4.1-mini | ~$0.003–0.01 | Fast |
| Anthropic | claude-haiku-4-5 | ~$0.0013 (~1334 tokens × $1/MTok) | Fast |
| Anthropic | claude-sonnet-4-5 | ~$0.004 (~1334 tokens × $3/MTok) | Medium |

**Claude Haiku is cheaper than gpt-4.1-mini for vision tasks** and still capable for text extraction.

### Scanned PDF Fallback

Same strategy as the OpenAI brainstorm: if `pdf-parse` returns empty text, convert PDF pages to images and send to Claude Vision. With Claude, we can send multiple page images in a single request (up to 100 images):

```typescript
// Send all pages at once (Claude can handle up to 100 images)
const pageImages = await convertPdfToImages(buffer); // pdf-to-img or pdfjs-dist

const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 4000,
  messages: [{
    role: "user",
    content: [
      ...pageImages.map((img, i) => [
        { type: "text" as const, text: `Page ${i + 1}:` },
        {
          type: "image" as const,
          source: { type: "base64" as const, media_type: "image/png" as const, data: img },
        },
      ]).flat(),
      {
        type: "text",
        text: "Extract all text from these document pages. Maintain page order.",
      },
    ],
  }],
});
```

### Where to Change

Same file: `src/service/rag/triggerEmbeddings.ts` → add `image/*` branch in `extractTextFromBuffer`. Replace OpenAI fetch call with Anthropic SDK call.

---

## C. Embedding Migration: Voyage AI

### The Fundamental Difference

**Anthropic does NOT offer its own embedding model.** Their official recommendation is [Voyage AI](https://docs.voyageai.com/).

### Voyage AI Models

| Model | Dimensions | Context | Best For | Price |
|-------|-----------|---------|----------|-------|
| `voyage-3-large` | 1024 (default), 256-2048 | 32K tokens | Best quality retrieval | Higher |
| `voyage-3.5` | 1024 (default), 256-2048 | 32K tokens | Balanced quality + speed | Medium |
| `voyage-3.5-lite` | 1024 (default), 256-2048 | 32K tokens | Lowest latency/cost | Lower |
| `voyage-multimodal-3` | 1024 | 32K | Images + text together | Higher |

### Migration Impact

**Current**: `text-embedding-3-small` → 1536 dimensions
**Proposed**: `voyage-3.5` → 1024 dimensions (default)

This dimension change means:
1. **Must re-embed all documents** — can't mix 1536-dim and 1024-dim vectors
2. **Update pgvector column**: `embedding Vector(1536)` → `embedding Vector(1024)`
3. **Update `match_document_embeddings` function**: update the vector parameter type
4. **Migration SQL**:
   ```sql
   -- Drop existing embeddings (will be regenerated)
   TRUNCATE document_embeddings;

   -- Alter vector dimension
   ALTER TABLE document_embeddings
     ALTER COLUMN embedding TYPE vector(1024);

   -- Recreate the match function with new dimension
   CREATE OR REPLACE FUNCTION match_document_embeddings(
     query_embedding vector(1024),
     match_count int DEFAULT 5,
     similarity_threshold float DEFAULT 0.5
   ) RETURNS TABLE (...) AS $$
     ...
   $$ LANGUAGE plpgsql;
   ```

### Voyage AI Integration

```bash
npm install voyageai  # or use HTTP API directly
```

```typescript
// Option A: Voyage AI npm package (Python-first, but has HTTP API)
const generateEmbeddings = async (segments: string[], inputType: "document" | "query") => {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: segments,
      model: "voyage-3.5",
      input_type: inputType, // "document" for ingestion, "query" for search
    }),
  });

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
};
```

### Key Advantage: `input_type` Parameter

Voyage AI has a dedicated `input_type` parameter:
- `"document"` — used when embedding documents for storage (prepends "Represent the document for retrieval:")
- `"query"` — used when embedding search queries (prepends "Represent the query for retrieving supporting documents:")

This asymmetric embedding improves retrieval quality compared to OpenAI's symmetric `text-embedding-3-small`. Our current implementation uses the same embedding call for both documents and queries — switching to Voyage with proper `input_type` should improve search accuracy.

### Multilingual Advantage

Voyage AI excels at multilingual embeddings. Our system handles Japanese and English documents — Voyage's training data includes strong multilingual coverage, which could improve cross-language search (user asks in English, document is in Japanese).

### Three Options

| Option | Approach | Effort | Risk |
|--------|----------|--------|------|
| **A. Full Voyage migration** | Replace OpenAI embeddings with Voyage AI | Large (re-embed all docs) | Downtime during re-embedding |
| **B. Hybrid** | Keep OpenAI embeddings, only migrate chat to Claude | Small (no embedding change) | Two API providers to maintain |
| **C. Gradual** | New documents use Voyage, batch-migrate old ones | Medium | Temporary dimension mismatch |

**For demo**: Option B (hybrid) is safest — migrate chat first, embeddings later. No re-embedding downtime.

**For production**: Option A (full migration) for ecosystem consistency and better multilingual support.

### Multimodal Embeddings (Future)

`voyage-multimodal-3` can embed images and text together into the same vector space. This means:
- Upload an image → embed the image directly (no text extraction step)
- Search "invoices from Company X" → finds both text and image documents

This is a future opportunity that eliminates the Vision API → text → embed pipeline entirely for images.

---

## D. Custom Tools via MCP Servers

### Current Tool Architecture

Tools are defined as OpenAI function-calling schemas in `src/app/api/openai/respond/tools/`:
```typescript
// Current pattern (OpenAI format)
export const ragTool = {
  definition: {
    type: "function",
    function: {
      name: "search_user_documents",
      description: "Search the user's uploaded documents...",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural language search query" },
          limit: { type: "integer", minimum: 1, maximum: 10, default: 5 },
        },
        required: ["query"],
      },
    },
  },
  handler: async (args, { supabase, user }) => {
    // ... handler logic (framework-agnostic)
  },
};
```

### Agent SDK: MCP Tool Pattern

The Agent SDK uses MCP (Model Context Protocol) with Zod schemas:

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define each tool with Zod schema
const searchDocumentsTool = tool(
  "search_user_documents",
  "Search the user's uploaded documents for the most relevant chunks to the query.",
  {
    query: z.string().describe("Natural language search query or question"),
    limit: z.number().min(1).max(10).default(5).describe("Maximum number of chunks to retrieve"),
  },
  async (args) => {
    // Same handler logic — just return MCP-formatted result
    const results = await searchUserDocuments(args.query, args.limit, supabase, user);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
);

const manageDocumentsTool = tool(
  "manage_documents",
  "Manage user documents. Search by name, list, or read content.",
  {
    action: z.enum(["list", "search", "get_content"]).describe("The action to perform"),
    searchTerm: z.string().optional().describe("File name to search for"),
    documentId: z.string().optional().describe("Document UUID for get_content"),
    limit: z.number().default(10).optional().describe("Max results"),
  },
  async (args) => {
    const result = await handleManageDocuments(args, supabase, user);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

const manageFoldersTool = tool(
  "manage_folders",
  "Manage folders in the user's file system.",
  {
    action: z.enum(["create", "read", "update", "delete", "list"]).describe("Action to perform"),
    id: z.string().optional().describe("Folder ID for read/update/delete"),
    data: z.object({
      name: z.string().optional(),
      parent_id: z.string().nullable().optional(),
    }).optional().describe("Data for create/update"),
  },
  async (args) => {
    const result = await handleManageFolders(args, supabase, user);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

const approvalRequestsTool = tool(
  "manage_approval_requests",
  "Manage approval requests. Create, read, update, delete, list with filters.",
  {
    action: z.enum(["create", "read", "update", "delete", "list"]).describe("Action to perform"),
    id: z.string().optional().describe("Request ID for read/update/delete"),
    data: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      vendor_name: z.string().optional(),
      category: z.string().optional(),
      amount: z.number().optional(),
      items: z.array(z.object({
        name: z.string(),
        quantity: z.number(),
        amount: z.number(),
      })).optional(),
      document_ids: z.array(z.string()).optional(),
      // ... other fields
    }).optional(),
    filters: z.object({
      status: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().optional(),
    }).optional(),
  },
  async (args) => {
    const result = await handleManageApprovalRequests(args, supabase, user);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Create the MCP server
const ebFilemgServer = createSdkMcpServer({
  name: "eb-filemg",
  version: "1.0.0",
  tools: [searchDocumentsTool, manageDocumentsTool, manageFoldersTool, approvalRequestsTool],
});
```

### Standard SDK: Anthropic Tool Format

For the standard SDK path, tools use a slightly different format from OpenAI:

```typescript
// Anthropic format (Standard SDK)
const tools = [
  {
    name: "search_user_documents",
    description: "Search the user's uploaded documents...",
    input_schema: {  // ← "input_schema" instead of "parameters"
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query" },
        limit: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["query"],
    },
  },
  // ... other tools
];
```

**Key difference**: `parameters` → `input_schema`. No `type: "function"` wrapper. Otherwise the JSON Schema structure is identical.

### MCP Transport Types

The Agent SDK supports three transport types for MCP servers, each suited to different deployment scenarios:

#### 1. stdio Servers (Local Processes)

Local processes communicating via stdin/stdout. Best for tools that need filesystem access or local execution:

```typescript
// In .mcp.json or programmatic config
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
    }
  }
}
```

#### 2. HTTP/SSE Servers (Remote APIs)

Cloud-hosted MCP servers accessible over HTTP. Best for shared team tools or third-party APIs:

```typescript
{
  "mcpServers": {
    "remote-api": {
      "type": "sse",  // or "http" for non-streaming
      "url": "https://api.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"  // Env var expansion
      }
    }
  }
}
```

#### 3. SDK MCP Servers (In-Process)

Custom tools running directly in your application. This is what we use for EB-FILEMG tools:

```typescript
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

const ebFilemgServer = createSdkMcpServer({
  name: "eb-filemg",
  version: "1.0.0",
  tools: [searchDocumentsTool, manageDocumentsTool, manageFoldersTool, approvalRequestsTool],
});

// Pass as: mcpServers: { "eb-filemg": ebFilemgServer }
```

**Important**: SDK MCP (in-process) tools require streaming input mode (`AsyncGenerator` prompt, not a simple string). This means if using single message mode for the chat API route, we'd need to wrap the string prompt in a generator or use a different approach for tool registration.

### .mcp.json Auto-Loading

The SDK automatically loads MCP server configs from a `.mcp.json` file at the project root:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "remote-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp/sse"
    }
  }
}
```

The `${VAR}` syntax expands environment variables at runtime. This file is loaded when `settingSources` includes `"project"`.

### Tool Search (Dynamic Tool Loading)

When many MCP tools are registered, their descriptions can consume a significant portion of the context window. Tool search dynamically loads tools on-demand instead of including all descriptions upfront.

**Configuration via `ENABLE_TOOL_SEARCH` env var:**

| Value | Behavior |
|-------|----------|
| `auto` | Activates when MCP tools exceed 10% of context window (default) |
| `auto:5` | Activates at 5% threshold |
| `true` | Always enabled |
| `false` | Disabled, all tools loaded upfront |

When triggered, MCP tools are marked with `defer_loading: true` and Claude uses a built-in search tool to discover relevant tools on-demand.

**Model requirement**: Requires Sonnet 4+ or Opus 4+. **Haiku does NOT support tool search.**

**EB-FILEMG relevance**: With only 4 custom tools, tool search is unlikely to trigger in `auto` mode. But if we add more MCP servers (e.g., Google Drive, S3, n8n), this becomes relevant.

### Allowing MCP Tools

MCP tools follow the naming convention `mcp__<server-name>__<tool-name>`. Wildcards are supported:

```typescript
allowedTools: [
  "mcp__eb-filemg__*",              // All tools from our server
  "mcp__github__list_issues",       // Only specific tool from another server
]
```

### MCP Connection Error Handling

The SDK emits a `system` message with subtype `init` at query start, including connection status for each MCP server:

```typescript
for await (const message of query({ prompt, options })) {
  if (message.type === "system" && message.subtype === "init") {
    const failedServers = message.mcp_servers?.filter(s => s.status !== "connected");
    if (failedServers?.length) {
      console.error("MCP servers failed to connect:", failedServers);
      // Gracefully degrade: continue without those tools
    }
  }
}
```

Default MCP connection timeout: 60 seconds.

### Handler Reuse

The most important insight: **all existing tool handler logic is framework-agnostic**. The handlers accept parsed arguments and a Supabase context, execute database queries, and return results. They work with both OpenAI and Anthropic — only the definition format and the calling convention change.

```
Current:  OpenAI function-calling schema → handler(args, ctx) → JSON result → tool message
Agent SDK: MCP tool schema (Zod) → handler(args) → CallToolResult → automatic injection
Standard: Anthropic input_schema → handler(args, ctx) → tool_result content block
```

---

## E. Agent Loop vs Two-Pass Orchestration

### Current: Manual Two-Pass

```
User message
  → 1st LLM call (tool_choice: "auto", non-streaming)
  → Parse tool_calls from response
  → Execute tools (sequential for...of loop)
  → 2nd LLM call (tool_choice: "none", streaming)
  → SSE stream to frontend
```

**Limitations:**
- Only one round of tool calls — if the LLM needs more info after seeing tool results, it can't request more tools
- Manual orchestration code (~150 lines in route.ts)
- Sequential tool execution (already identified as improvement in OpenAI brainstorm)

### Agent SDK: Built-In Agent Loop

```
User message
  → query() starts
    → Claude decides: need tools? → yes → execute tools (automatically)
    → Claude sees results → need more tools? → yes → execute again
    → Claude sees results → need more tools? → no → generate final answer
  → Stream final answer to frontend
```

The Agent SDK handles the **entire loop**. It will:
1. Send the user message to Claude
2. If Claude returns `stop_reason: "tool_use"`, execute the requested tools
3. Send tool results back to Claude
4. Repeat steps 2-3 until Claude returns `stop_reason: "end_turn"`
5. Stream the final response

**This solves the multi-step retrieval problem (brainstorm Section M) automatically.** Example:

```
User: "Compare the Q1 and Q2 budget proposals"
  → Claude calls search_user_documents("Q1 budget proposal")
  → Gets Q1 results
  → Claude calls search_user_documents("Q2 budget proposal")  ← SECOND RETRIEVAL
  → Gets Q2 results
  → Claude synthesizes comparison
```

With the current two-pass architecture, this would fail because the 2nd call has `tool_choice: "none"`. With the Agent SDK, it just works.

### Standard SDK: Manual Agent Loop

If using the standard SDK, implement the loop yourself:

```typescript
const MAX_TOOL_ROUNDS = 5;
let messages = [...conversationMessages];

for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: toolDefinitions,
    messages,
  });

  // Append assistant response to message history
  messages.push({ role: "assistant", content: response.content });

  // If no more tools needed, stream the final response
  if (response.stop_reason !== "tool_use") {
    // This IS the final response — return it
    return response;
  }

  // Execute tool calls
  const toolUses = response.content.filter(b => b.type === "tool_use");
  const toolResults = await Promise.all(
    toolUses.map(async (tu) => {
      const handler = getToolHandler(tu.name);
      const result = await handler(tu.input, { supabase, user });
      return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(result) };
    })
  );

  // Append tool results and continue loop
  messages.push({ role: "user", content: toolResults });
}
```

**Note**: Claude's tool_use already supports **parallel tool calls natively**. When Claude decides it needs both `search_user_documents` and `manage_documents` simultaneously, it returns multiple `tool_use` blocks in a single response. The `Promise.all` above executes them in parallel — no manual parallelization needed (this was identified as an improvement in the OpenAI brainstorm Section K).

### Trade-Off Analysis

| Aspect | Agent SDK | Manual Loop (Standard SDK) |
|--------|-----------|---------------------------|
| Lines of code | ~20 (query + options) | ~50 (loop + error handling) |
| Multi-step retrieval | Automatic | Implemented in the loop |
| Parallel tool calls | Automatic (Agent SDK handles it) | Manual Promise.all (but Claude itself returns parallel tool_use blocks) |
| Iteration control | `maxTurns` option | `MAX_TOOL_ROUNDS` constant |
| Streaming control | Per-message granularity | Per-event granularity |
| Debugging | Less transparent (black box) | Full visibility into each round |

---

## F. Streaming Architecture

### Current: OpenAI Raw SSE

The current system uses `fetch()` with `stream: true` and reads the raw SSE response:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

Frontend parser in `useAssistantStream.ts` splits on `\n\n`, finds `data:` lines, parses JSON, extracts `choices[0].delta.content`.

### Agent SDK Streaming

The Agent SDK returns an `AsyncGenerator<SDKMessage>`:

```typescript
for await (const message of query({ prompt, options })) {
  switch (message.type) {
    case "system":
      // Init message with session_id
      if (message.subtype === "init") sessionId = message.session_id;
      break;

    case "assistant":
      // Full assistant message (after each LLM call completes)
      for (const block of message.message.content) {
        if (block.type === "text") { /* text content */ }
        if (block.type === "tool_use") { /* tool was called */ }
      }
      break;

    case "stream_event":
      // Real-time deltas (only with includePartialMessages: true)
      if (message.event.type === "content_block_delta") {
        if (message.event.delta.type === "text_delta") {
          // This is the text chunk — send via SSE to frontend
          const text = message.event.delta.text;
        }
      }
      break;

    case "result":
      // Final result
      if (message.subtype === "success") {
        // message.result contains the final text
        // message.total_cost_usd contains the cost
      }
      break;
  }
}
```

### Standard SDK Streaming

```typescript
const stream = anthropic.messages.stream({
  model: CLAUDE_MODEL,
  max_tokens: 2048,
  system: SYSTEM_PROMPT,
  tools: toolDefinitions,
  messages: conversationMessages,
});

for await (const event of stream) {
  switch (event.type) {
    case "message_start":
      // Contains initial message metadata
      break;
    case "content_block_start":
      // New content block (text or tool_use)
      break;
    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        // Send to frontend: event.delta.text
      } else if (event.delta.type === "input_json_delta") {
        // Tool input being streamed (partial JSON)
      }
      break;
    case "content_block_stop":
      break;
    case "message_delta":
      // stop_reason appears here
      break;
    case "message_stop":
      // Stream complete
      break;
  }
}
```

### StreamEvent Type Reference

When `includePartialMessages: true` is set, the SDK yields `SDKPartialAssistantMessage` objects (type `"stream_event"`) containing raw API events:

```typescript
type SDKPartialAssistantMessage = {
  type: "stream_event";
  event: RawMessageStreamEvent;        // From Anthropic SDK
  parent_tool_use_id: string | null;   // Non-null if from a subagent
  uuid: string;                        // Unique event identifier
  session_id: string;                  // Session identifier
}
```

The `parent_tool_use_id` is key for identifying events from subagents — if non-null, this event came from a subagent spawned via the Task tool.

### Complete Message Flow

With streaming enabled, a single agent turn produces this sequence:

```
StreamEvent (message_start)           ← New LLM response begins
StreamEvent (content_block_start)     ← Text block begins
StreamEvent (content_block_delta)     ← Text chunk: "I'll search"
StreamEvent (content_block_delta)     ← Text chunk: " your documents"
StreamEvent (content_block_stop)      ← Text block ends
StreamEvent (content_block_start)     ← Tool use block begins (type: "tool_use")
StreamEvent (content_block_delta)     ← Tool input JSON chunk: {"query":
StreamEvent (content_block_delta)     ← Tool input JSON chunk: "invoice"}
StreamEvent (content_block_stop)      ← Tool use block ends
StreamEvent (message_delta)           ← stop_reason: "tool_use"
StreamEvent (message_stop)            ← Message complete
AssistantMessage                      ← Complete message with all content blocks
  ... tool executes (search_user_documents) ...
StreamEvent (message_start)           ← Next turn begins
StreamEvent (content_block_start)     ← Text block
StreamEvent (content_block_delta)     ← Text chunk: "I found 3 invoices..."
StreamEvent (content_block_stop)
StreamEvent (message_delta)           ← stop_reason: "end_turn"
StreamEvent (message_stop)
AssistantMessage                      ← Complete final message
ResultMessage                         ← Final result with cost/usage
```

### Streaming Tool Calls

To track tool calls in real-time (useful for showing "Searching documents..." UI indicators):

```typescript
let currentToolName: string | null = null;
let toolInputChunks: string[] = [];

for await (const message of query({ prompt, options: { includePartialMessages: true } })) {
  if (message.type !== "stream_event") continue;
  const event = message.event;

  switch (event.type) {
    case "content_block_start":
      if (event.content_block.type === "tool_use") {
        currentToolName = event.content_block.name;
        toolInputChunks = [];
        // UI: Show "[Using search_user_documents...]"
      }
      break;

    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        // Stream text to frontend
      } else if (event.delta.type === "input_json_delta") {
        toolInputChunks.push(event.delta.partial_json);
        // Accumulate tool input JSON
      }
      break;

    case "content_block_stop":
      if (currentToolName) {
        // UI: Show "[Using search_user_documents...] done"
        currentToolName = null;
      }
      break;
  }
}
```

### Known Streaming Limitations

| Limitation | Detail |
|-----------|--------|
| **Extended thinking** | When `maxThinkingTokens` is explicitly set, `StreamEvent` messages are **not** emitted. Thinking is disabled by default, so streaming works unless you enable it. |
| **Structured output** | JSON result appears only in the final `ResultMessage.structured_output`, not as streaming deltas. Cannot stream structured output progressively. |
| **Subagent events** | Events from subagents include `parent_tool_use_id` but may interleave with main agent events. Filter by `parent_tool_use_id` to separate them. |

### Adapting for the Frontend

The frontend SSE parser (`useAssistantStream.ts`) expects this format:
```
data: {"choices":[{"delta":{"content":"text"}}]}
data: [DONE]
```

Two options:

**Option A: Translate to existing format** (minimal frontend changes):
```typescript
// Backend: Convert Anthropic events to OpenAI-compatible SSE
const translateToExistingFormat = (text: string) => {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text } }],
  })}\n\n`;
};
```

**Option B: New SSE format** (cleaner, requires frontend update):
```typescript
// Backend: Native Anthropic SSE format
const sendSSE = (type: string, data: any) => {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
};

// Events:
// data: {"type":"text_delta","text":"Hello"}
// data: {"type":"tool_metadata","files":[...],"rag_sources":[...]}
// data: {"type":"done"}
```

### Metadata Injection

Current system sends `tool_metadata` events before the text stream (file cards, RAG sources, approval request IDs). This pattern works with both approaches — inject metadata SSE events before streaming text:

```typescript
// 1. Send metadata from tool results
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({ type: "tool_metadata", files: [...], ragSources: [...] })}\n\n`
));

// 2. Stream text deltas
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ type: "text_delta", text: event.delta.text })}\n\n`
    ));
  }
}

// 3. Signal completion
controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
```

---

## G. Session Management & Conversation Persistence

### Current Architecture

All messages are stored in Supabase `ai_messages` table. On each chat request, the frontend sends the full conversation history from Supabase. The backend prepends the system prompt and sends everything to OpenAI.

### Agent SDK Sessions

The Agent SDK has built-in session persistence:

```typescript
// First message: capture session ID
let sessionId: string;

for await (const message of query({
  prompt: "Analyze my invoice",
  options: { model: "claude-sonnet-4-5-20250929", mcpServers: { ... } },
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
    // Save to Supabase: UPDATE ai_threads SET metadata = {agent_session_id: sessionId}
  }
}

// Subsequent messages: resume session
for await (const message of query({
  prompt: "Now create a ringi from it",
  options: { resume: sessionId },
})) {
  // Claude remembers the invoice from the previous message
}
```

### Dual Persistence Strategy

We likely need **both** Agent SDK sessions AND Supabase messages:

- **Agent SDK sessions** → Claude's context (what the LLM remembers)
- **Supabase messages** → UI display (what the user sees in the chat thread)

```
Frontend: Display messages from Supabase
Backend: Use Agent SDK session for LLM context
Sync: After each Agent SDK interaction, save the response to Supabase ai_messages
```

### Session Forking

An interesting capability: `forkSession: true` creates a new session that branches from the current context.

**Use case for ringi**: User uploads documents, AI analyzes them. User says "create a ringi." AI proposes. User says "actually, try a different approach." Instead of modifying the conversation, fork the session and explore alternatives without losing the original.

### Standard SDK Approach

With the standard SDK, sessions are manual — same as current architecture:
- Store messages in Supabase
- Send conversation history on each request
- No session forking (but also no session management overhead)

---

## H. System Prompt Engineering (Anthropic-Specific)

### Claude's XML Tag Affinity

Claude models are specifically trained to follow instructions in XML-like tags. This is a well-documented best practice in Anthropic's prompt engineering guides. The restructured prompt from the OpenAI brainstorm (Section I) maps naturally to Claude's preferred format:

```xml
<role>
You are the EB-FILEMG AI File Management Assistant. You help users organize,
search, and manage documents, folders, and approval requests (ringi).
Respond in {languageLabel} ({languageCode}) unless the user requests otherwise.
Be concise — short paragraphs, no filler.
</role>

<tool_selection>
Choose tools based on what the user needs:
- User mentions a file by NAME → manage_documents(search) to resolve UUID first
- User asks about file CONTENT → search_user_documents (semantic search)
- User says "create a ringi" with attached docs → manage_documents(get_content) to read doc,
  THEN manage_approval_requests(create)
- User asks "what files do I have?" → manage_documents(list)
- Ambiguous? Check documents with tools BEFORE asking the user.
</tool_selection>

<rules>
APPROVAL REQUESTS:
- Never assume amounts. If one amount + multiple items → ask: total or per-item?
- Exception: user says "don't divide" → single item with total amount.
- Items must have: name (string), quantity (number, default 1), amount (number).

DOCUMENTS:
- Always resolve file names to UUIDs before passing to tools.
- When user says "create request with this doc" → read the document first.

SEARCH RESULTS:
- NEVER list file details in your text.
- Say "I found X documents" — the UI renders file cards automatically.
- NEVER include download links.

MULTI-FILE:
- When multiple files are uploaded in a single message, treat them as a related batch.
- Summarize findings across ALL files before taking action.
- Cross-reference amounts across files for consistency.
</rules>

<output_format>
- Keep responses concise: 2-4 sentences for simple answers
- Use markdown tables for structured data
- For approval request confirmations, summarize key fields before asking "Should I create this?"
</output_format>
```

### Agent SDK System Prompt

```typescript
// Option 1: Custom string
options: {
  systemPrompt: SYSTEM_PROMPT_STRING,
}

// Option 2: Claude Code preset + custom additions
options: {
  systemPrompt: {
    type: "preset",
    preset: "claude_code",
    append: "Additional instructions specific to EB-FILEMG...",
  },
}
```

For our use case, Option 1 (custom string) is correct — we're not a code-editing agent.

### Extended Thinking

Claude supports extended thinking for complex reasoning:

```typescript
// Standard SDK
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4096,
  thinking: {
    type: "enabled",
    budget_tokens: 2000, // Up to 2000 tokens for internal reasoning
  },
  messages: [...],
});
```

**Use case**: When the AI needs to extract details from a complex document and decide what fields to fill for a ringi. Extended thinking lets Claude "reason through" the document analysis before producing the final tool call.

**Cost trade-off**: Thinking tokens are charged at output rates. For simple queries (file search, list), don't enable it. For complex queries (create ringi from multi-file batch), the improved accuracy may be worth it.

### Tool Choice Options

| OpenAI | Anthropic | Behavior |
|--------|-----------|----------|
| `"auto"` | `{ type: "auto" }` | Model decides (default) |
| `"none"` | `{ type: "none" }` (or omit tools) | No tools allowed |
| `"required"` | `{ type: "any" }` | Must use at least one tool |
| `{ type: "function", function: { name: "X" } }` | `{ type: "tool", name: "X" }` | Force specific tool |

---

## I. Dual-Layer Content Model (ai_judgment)

### Same Concept, Different LLM

The `ai_judgment` JSONB column concept from the OpenAI brainstorm (Section B) is framework-agnostic. The only change is which model generates the judgment.

### Model Selection for Classification

| Model | Cost per File (~3K input + 500 output tokens) | Speed | Quality |
|-------|----------------------------------------------|-------|---------|
| OpenAI gpt-4.1-mini | ~$0.0004 | Fast | Good |
| Claude Haiku 4.5 | ~$0.0004 (3K × $1/MTok + 500 × $5/MTok) | Fast | Good |
| Claude Sonnet 4.5 | ~$0.0035 | Medium | Better |

**Claude Haiku 4.5 is price-competitive with gpt-4.1-mini** for classification tasks and keeps us in the Anthropic ecosystem.

### Implementation with Anthropic SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const generateAIJudgment = async (textContent: string, fileName: string) => {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Analyze this document and return structured metadata as JSON.

File: ${fileName}

Content:
${textContent.slice(0, 3000)}

Return JSON with these fields:
- document_type: string (invoice, contract, receipt, meeting_notes, report, etc.)
- summary: string (2-3 sentences)
- purpose: string
- key_entities: { people: string[], organizations: string[], amounts: string[], dates: string[] }
- tags: string[] (search tags)
- language: string (ja, en, mixed)
- confidence: number (0-1)`,
    }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
  return JSON.parse(text);
};
```

### Agent SDK Subagent for Batch Processing

With the Agent SDK, file processing could use a subagent:

```typescript
// Define a classification subagent
options: {
  agents: {
    "document-classifier": {
      description: "Classifies documents and generates structured metadata",
      prompt: "Analyze uploaded documents and return structured ai_judgment JSON.",
      model: "haiku",
      tools: ["mcp__eb-filemg__manage_documents"],
    },
  },
}
```

This is an advanced pattern — useful for batch processing but likely overkill for single-file ingestion.

---

## J. RAG Reliability Improvements

These improvements from the OpenAI brainstorm (Sections E1-E4) are **framework-agnostic** — they apply regardless of which LLM or embedding provider we use:

### J1. Content Deduplication (SHA-256)

**Same implementation.** Hash `text_content` with SHA-256, check for duplicates per user before generating embeddings. No change for Anthropic migration.

### J2. Safe Ingestion Order

**Same implementation.** Reorder: extract → chunk → embed → DELETE old → INSERT new → update text_content. No change for Anthropic migration.

### J3. Embedding Metadata Enrichment

If migrating to Voyage AI, update the metadata to include Voyage-specific info:

```typescript
metadata: {
  chunk_index: index,
  file_name: document.file_name,
  file_path: document.file_path,
  mime_type: document.mime_type,
  category: document.category,
  embedding_model: "voyage-3.5",  // Track which model generated the embedding
  embedding_dimension: 1024,       // Track dimension for future migrations
  length: chunk.length,
}
```

### J4. Ringi ID Join-at-Query-Time

**Same implementation.** Query `approval_request_documents` after RAG returns document IDs. Framework-agnostic.

### J5. Similarity Threshold

Voyage AI embeddings use cosine similarity (same as current pgvector setup). The default threshold of 0.5 may need tuning since Voyage embeddings have different similarity distributions than OpenAI embeddings. Make it configurable via environment variable:

```typescript
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.RAG_SIMILARITY_THRESHOLD || "0.5"
);
```

---

## K. Reliability & Error Handling

### Agent SDK Hooks

The Agent SDK provides lifecycle hooks for validation and error handling:

```typescript
import { query, HookCallback } from "@anthropic-ai/claude-agent-sdk";

// UUID validation hook (replaces manual check in tool-execution.ts)
const validateToolInputs: HookCallback = async (input) => {
  const toolInput = (input as any).tool_input;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (toolInput?.documentId && !UUID_REGEX.test(toolInput.documentId)) {
    return {
      decision: "block",
      reason: `Invalid documentId "${toolInput.documentId}". Use manage_documents(search) first.`,
    };
  }

  return {}; // Allow
};

// Audit logging hook
const logToolResults: HookCallback = async (input) => {
  const { tool_name, tool_input, tool_response } = input as any;
  console.log(`Tool: ${tool_name}`, { input: tool_input, response: tool_response });
  return {};
};

// Use in query
for await (const message of query({
  prompt: userMessage,
  options: {
    hooks: {
      PreToolUse: [{ matcher: "mcp__eb-filemg__*", hooks: [validateToolInputs] }],
      PostToolUse: [{ hooks: [logToolResults] }],
    },
    maxTurns: 5,        // Prevent infinite loops
    maxBudgetUsd: 0.50, // Prevent runaway costs
  },
})) {
  // ...
}
```

### Standard SDK Error Handling

With the standard SDK, implement these manually (similar to OpenAI brainstorm Section F):

```typescript
// Timeout wrapper
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);

// Response validation
const response = await withTimeout(
  anthropic.messages.create({ ... }),
  30_000 // 30s timeout
);

if (!response.content?.length) {
  return NextResponse.json(
    { error: "AI did not produce a response. Please try again." },
    { status: 502 }
  );
}
```

### Built-In Protections

| Protection | Agent SDK | Standard SDK |
|-----------|-----------|-------------|
| Infinite loop prevention | `maxTurns` option | Manual loop counter |
| Cost control | `maxBudgetUsd` option | Manual token tracking |
| Request cancellation | `AbortController` option | Manual AbortController |
| Tool input validation | PreToolUse hooks | Manual checks before tool execution |
| Audit logging | PostToolUse hooks | Manual logging after tool execution |
| Retry logic | Built-in | Manual implementation |

---

## L. Implementation Priority & Migration Roadmap

### Phase 1: Chat Migration (Keep Embeddings)

**Goal**: Replace OpenAI chat with Claude, minimal changes.

1. Install `@anthropic-ai/sdk`
2. Create `src/app/api/anthropic/respond/` (or update existing route)
3. Translate tool definitions: `parameters` → `input_schema`
4. Implement tool loop (Standard SDK approach — ~50 lines)
5. Adapt SSE streaming (translate Anthropic events to existing frontend format)
6. Update system prompt with XML tags
7. Keep `text-embedding-3-small` for embeddings (hybrid approach)

**Effort**: Medium (3-5 days)
**Risk**: Low (embeddings unchanged, only chat layer migrates)

### Phase 2: Agent SDK Integration

**Goal**: Replace manual tool loop with Agent SDK.

1. Install `@anthropic-ai/claude-agent-sdk`
2. Define MCP tools using `tool()` + `createSdkMcpServer()`
3. Replace route handler with Agent SDK `query()`
4. Add hooks for validation and logging
5. Multi-step retrieval now works automatically
6. Test parallel tool calls

**Effort**: Medium (3-5 days)
**Risk**: Medium (Agent SDK maturity, latency testing needed)

### Phase 3: Vision & File Processing

**Goal**: Add image understanding, improve ingestion.

1. Add image branch in `extractTextFromBuffer` using Claude Vision
2. Add scanned PDF fallback (Vision on empty pdf-parse results)
3. Add `ai_judgment` generation using Claude Haiku
4. Implement content deduplication (SHA-256)
5. Implement safe ingestion order

**Effort**: Medium (3-5 days)
**Risk**: Low (isolated changes in ingestion pipeline)

### Phase 4: Embedding Migration to Voyage AI

**Goal**: Full Anthropic ecosystem. Better multilingual search.

1. Sign up for Voyage AI, get API key
2. Update `generateEmbeddings` to call Voyage API with `input_type`
3. Run migration: truncate embeddings → alter vector dimension → re-embed all documents
4. Update `match_document_embeddings` function
5. Tune similarity threshold
6. Test Japanese ↔ English cross-language search

**Effort**: Large (5-7 days, mostly re-embedding and testing)
**Risk**: High (downtime during migration, quality regression possible)

### Phase 5: Advanced Features (Post-Demo)

- Session management (resume/fork)
- Subagents for batch processing
- Extended thinking for complex ringi creation
- `voyage-multimodal-3` for direct image embeddings

---

## M. Subagents for Parallel Workflows

### What Are Subagents?

Subagents are separate agent instances that the main agent can spawn to handle focused subtasks. They provide context isolation (analysis doesn't pollute main chat), parallelization, specialized instructions, and per-agent tool restrictions.

### AgentDefinition API

```typescript
type AgentDefinition = {
  description: string;    // Required — natural language description of WHEN to use this agent
  prompt: string;         // Required — the agent's system prompt
  tools?: string[];       // Optional — allowed tool names. Omit to inherit all tools
  model?: "sonnet" | "opus" | "haiku" | "inherit";  // Optional — model override
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | Natural language description; Claude uses this to decide when to invoke the agent |
| `prompt` | Yes | The agent's system prompt defining its role and behavior |
| `tools` | No | Array of allowed tool names. Omit = inherit all parent tools |
| `model` | No | Model override. `"haiku"` for cheap tasks, `"opus"` for complex ones, `"inherit"` (default) for parent model |

### Three Creation Methods

#### 1. Programmatic (Recommended)

Define agents in the `agents` option of `query()`:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Process these 3 uploaded invoices and create a ringi",
  options: {
    allowedTools: ["Read", "Grep", "Glob", "Task", "mcp__eb-filemg__*"],
    mcpServers: { "eb-filemg": ebFilemgServer },
    agents: {
      "document-classifier": {
        description: "Classifies documents and extracts structured metadata. Use for analyzing uploaded files.",
        prompt: `You are a document classification specialist. Analyze the provided document content and return structured metadata including: document_type, summary, key_entities, tags, language, and confidence score.`,
        tools: ["Read", "Grep", "Glob"],  // Read-only: cannot modify anything
        model: "haiku"  // Cheap model for classification
      },
      "ringi-creator": {
        description: "Creates approval requests (ringi) from analyzed document data. Use after documents have been classified.",
        prompt: `You are a ringi creation specialist. Given classified document data, create a properly structured approval request with title, description, vendor, category, amount, and line items.`,
        tools: ["mcp__eb-filemg__manage_approval_requests", "mcp__eb-filemg__manage_documents"],
        model: "sonnet"  // Better model for complex reasoning
      }
    }
  }
})) {
  // Main agent orchestrates: sends files to document-classifier,
  // then passes results to ringi-creator
}
```

**Key requirement**: `allowedTools` must include `"Task"` — subagents are invoked via the Task tool.

#### 2. Filesystem-Based

Define agents as markdown files in `.claude/agents/` directories:

```
.claude/agents/document-classifier.md
```

```markdown
---
description: Classifies documents and extracts structured metadata
tools: ["Read", "Grep", "Glob"]
model: haiku
---

You are a document classification specialist...
```

Loaded when `settingSources` includes `"project"`. Filesystem agents are loaded at startup only — creating new files requires a session restart.

#### 3. Built-in general-purpose

Claude can invoke the built-in `general-purpose` subagent at any time via the Task tool without any definition. This provides a default research/exploration agent.

### Automatic Invocation

Claude decides when to invoke subagents based on the `description` field. If the user says "analyze these invoices," and a `document-classifier` agent has description "Classifies documents and extracts structured metadata," Claude will autonomously choose to spawn it. You can also explicitly name agents in the prompt: "Use the document-classifier agent to analyze this file."

### Tool Restrictions Per Subagent

This is a key pattern for safety and context isolation:

| Use Case | Tools | Description |
|----------|-------|-------------|
| Read-only analysis | `Read`, `Grep`, `Glob` | Examine code/files but cannot modify |
| Test execution | `Bash`, `Read`, `Grep` | Run commands and analyze output |
| Code modification | `Read`, `Edit`, `Write`, `Grep`, `Glob` | Full read/write, no shell execution |
| Full access | _(omit tools field)_ | Inherits all parent tools |

### Dynamic Agent Configuration

Factory functions can create agent definitions based on runtime conditions:

```typescript
function createClassifierAgent(fileType: string): AgentDefinition {
  const isImage = fileType.startsWith("image/");
  return {
    description: `Classifies ${isImage ? "image" : "text"} documents`,
    prompt: isImage
      ? "You are an image document classifier. Use vision to analyze images..."
      : "You are a text document classifier. Analyze text content...",
    tools: ["Read", "Grep"],
    model: isImage ? "sonnet" : "haiku"  // Vision tasks may need a stronger model
  };
}

// Use at query time
const agents = {
  "classifier": createClassifierAgent(uploadedFile.mimeType),
};
```

### Resuming Subagents

Subagents can be resumed to continue where they left off, retaining their full conversation history:

1. Capture the `session_id` from the init message during the first query
2. Extract the `agentId` from the Task tool result (regex: `agentId:\s*([a-f0-9-]+)`)
3. Resume: pass `resume: sessionId` and reference the agent ID in the prompt

```typescript
// First run: capture session and agent IDs
let sessionId: string;
let classifierAgentId: string;

for await (const message of query({ prompt: "Classify this invoice", options })) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
  // Parse agentId from Task tool results...
}

// Later: resume and continue the subagent's work
for await (const message of query({
  prompt: `Resume the classifier agent (${classifierAgentId}) and now extract line items`,
  options: { resume: sessionId, agents: { "document-classifier": classifierDefinition } }
})) {
  // Subagent continues with full prior context
}
```

**Key facts**: Subagent transcripts persist independently of main conversation. Main conversation compaction does not affect subagent transcripts. Automatic cleanup based on `cleanupPeriodDays` (default: 30 days).

### Constraints

- **No nesting**: Subagents **cannot** spawn their own subagents. Do not include `Task` in a subagent's `tools` array.
- **Programmatic precedence**: Programmatically defined agents take precedence over filesystem-based agents with the same name.
- **Filesystem agents loaded at startup only**: New `.claude/agents/` files require session restart.

### EB-FILEMG Application

**Multi-file upload processing**: When a user drops 3 invoices into chat, the main agent could spawn a `document-classifier` subagent (Haiku, read-only) for each file in parallel, then aggregate results and pass to a `ringi-creator` subagent (Sonnet) that creates the approval request.

**Context isolation benefit**: File analysis (potentially large text content) happens inside the subagent's context window, not the main chat context. The main agent only receives the structured summary from each subagent, keeping the chat context clean for the user conversation.

**Cost optimization**: `document-classifier` runs on Haiku (~$0.0004/file), `ringi-creator` runs on Sonnet (~$0.0035/request). Total for 3-file ringi: ~$0.005 vs running everything on Sonnet (~$0.015).

---

## N. Skills: Packaging Domain Workflows

### What Are Skills?

Skills are reusable, domain-specific instruction packages defined as `SKILL.md` files. They extend Claude with specialized capabilities that are automatically invoked based on context matching.

### How Skills Work

1. **Defined as filesystem artifacts**: Created as `SKILL.md` files in `.claude/skills/` directories
2. **Loaded from filesystem**: Requires `settingSources: ["user", "project"]` in query options
3. **Automatically discovered**: Skill metadata is discovered at startup; full content loaded when triggered
4. **Model-invoked**: Claude autonomously chooses when to use them based on the `description` field
5. **Enabled via allowedTools**: Must include `"Skill"` in `allowedTools`

**Critical**: Unlike subagents, Skills **cannot** be defined programmatically. They must exist as filesystem artifacts (`SKILL.md` files).

### Skill Locations

| Location | Scope | Loaded When |
|----------|-------|-------------|
| `.claude/skills/` (project) | Shared with team via git | `settingSources` includes `"project"` |
| `~/.claude/skills/` (user) | Personal, across all projects | `settingSources` includes `"user"` |

### Creating a Skill

```
.claude/skills/process-invoice/
  SKILL.md
```

```markdown
---
description: Process uploaded invoice files — extract amounts, vendor, dates, and create approval requests
allowed-tools: ["Read", "Bash", "mcp__eb-filemg__*"]
---

# Invoice Processing Skill

When the user uploads an invoice document:

1. Extract text content from the document
2. Identify key fields: vendor name, invoice number, date, total amount, line items
3. Ask the user to confirm the extracted data
4. Create an approval request (ringi) with the extracted data

## Rules
- Always resolve file names to UUIDs before passing to tools
- Never assume amounts — ask if ambiguous
- For multi-page invoices, process all pages before summarizing
```

### SDK Usage

```typescript
for await (const message of query({
  prompt: "Process the uploaded invoice and create a ringi",
  options: {
    cwd: "/path/to/project",  // Project root with .claude/skills/
    settingSources: ["user", "project"],  // Required to load Skills
    allowedTools: ["Skill", "Read", "Write", "Bash", "mcp__eb-filemg__*"],
    mcpServers: { "eb-filemg": ebFilemgServer },
  }
})) {
  // Claude will automatically invoke the "process-invoice" Skill
  // if the user's request matches its description
}
```

**Note**: The `allowed-tools` frontmatter field in SKILL.md only applies when using Claude Code CLI directly. Through the SDK, use the main `allowedTools` option instead.

### Skills vs Subagents: Trade-Off Analysis

| Aspect | Skills | Subagents |
|--------|--------|-----------|
| **Definition** | Filesystem only (SKILL.md) | Programmatic (recommended) or filesystem |
| **Context** | Runs in main context | Isolated context (separate window) |
| **Model** | Uses main model | Can specify per-agent model |
| **Tool restrictions** | Via main `allowedTools` only | Per-agent `tools` array |
| **Parallelism** | Sequential (one at a time) | Parallel (multiple subagents) |
| **Best for** | Workflow instructions, domain knowledge | Isolated tasks, parallel processing, cost optimization |
| **EB-FILEMG fit** | Ringi creation workflow, file naming conventions | Multi-file classification, batch processing |

### EB-FILEMG Application

**As Skills**: Package the ringi creation workflow (extract → confirm → create) as a Skill. The Skill provides the step-by-step instructions, but execution happens in the main chat context. Good for workflows that need user interaction (confirmations, clarifications).

**As Subagents**: Better for the classification pipeline where context isolation and parallel processing matter. The classifier doesn't need user interaction — it processes and returns structured data.

**Recommendation**: Use Skills for user-facing workflows (ringi creation, document search guidance) and Subagents for background processing (classification, batch operations). They complement each other.

---

## O. Hosting & Deployment

### The Key Architectural Difference

The Claude Agent SDK is fundamentally different from a standard LLM API call:

| Aspect | Standard SDK (`@anthropic-ai/sdk`) | Agent SDK (`@anthropic-ai/claude-agent-sdk`) |
|--------|--------------------------------------|----------------------------------------------|
| **Execution model** | Stateless API call | Long-running process |
| **Shell access** | None | Persistent shell environment |
| **File operations** | None | Working directory with file I/O |
| **Tool execution** | Manual (your code) | Automatic with context from prior interactions |
| **Deployment** | Any serverless platform | Requires container sandboxing |

The Agent SDK spawns a subprocess that manages a persistent shell, file system, and tool execution loop. This means it **cannot** run as a simple Next.js API route handler on Vercel Functions — it needs a container.

### System Requirements

Each Agent SDK instance requires:

| Resource | Requirement |
|----------|-------------|
| **Runtime** | Node.js 18+ |
| **CLI** | `npm install -g @anthropic-ai/claude-code` |
| **RAM** | Recommended 1GiB |
| **Disk** | 5GiB |
| **CPU** | 1 vCPU |
| **Network** | Outbound HTTPS to `api.anthropic.com` |
| **Auth** | `ANTHROPIC_API_KEY` env var |

### Deployment Patterns

| Pattern | Description | Use Case | EB-FILEMG Fit |
|---------|-------------|----------|---------------|
| **Ephemeral Sessions** | New container per task, destroy when complete | Invoice processing, one-shot classification | File ingestion pipeline |
| **Long-Running Sessions** | Persistent container, multiple SDK processes | High-frequency chat bots, email agents | Interactive chat (if using Agent SDK) |
| **Hybrid Sessions** | Ephemeral containers hydrated with session history via `resume` | Customer support, research agents | Chat with session resumption |
| **Single Container** | Multiple SDK processes in one global container | Agent simulations | Not applicable |

### Sandbox Providers

| Provider | Type | Key Feature |
|----------|------|-------------|
| **Modal** | Cloud containers | GPU support, easy scaling |
| **Cloudflare Sandboxes** | Edge containers | Low latency, global distribution |
| **E2B** | Cloud sandboxes | Purpose-built for AI agents |
| **Fly Machines** | Micro VMs | Fast startup, global regions |
| **Vercel Sandbox** | Firecracker microVMs | Millisecond startup, snapshotting, `@vercel/sandbox` SDK |
| **Docker/gVisor** | Self-hosted | Full control, existing infrastructure |

### Vercel Sandbox (Most Relevant for EB-FILEMG)

Since EB-FILEMG is deployed on Vercel (Next.js), Vercel Sandbox is the most natural fit for running the Agent SDK:

```typescript
import { Sandbox } from "@vercel/sandbox";

// Create an ephemeral sandbox for Agent SDK execution
const sandbox = await Sandbox.create({
  runtime: "node22",
  // Each sandbox runs in a secure Firecracker microVM
  // Fast startup (milliseconds), ephemeral by default
});

// Execute Agent SDK code inside the sandbox
const result = await sandbox.exec("node", ["-e", `
  const { query } = require("@anthropic-ai/claude-agent-sdk");
  // ... run query inside sandbox
`]);

// Snapshotting: save state to resume later
const snapshot = await sandbox.snapshot();
// Later: resume from snapshot
const resumed = await Sandbox.create({ snapshot });
```

**Key features**:
- Runs on Amazon Linux 2023 with `node22`, `node24`, `python3.13` runtimes
- Each sandbox is a secure Firecracker microVM (same tech as AWS Lambda)
- Millisecond startup time
- Snapshotting capability (save/resume sandbox state — useful for session persistence)
- SDK: `@vercel/sandbox` (TypeScript)
- Default working directory: `/vercel/sandbox`

### How This Maps to EB-FILEMG Architecture

```
Current Architecture:
  User → Next.js API Route → OpenAI API → Response
  (Serverless, stateless, simple)

With Standard Anthropic SDK:
  User → Next.js API Route → Anthropic Messages API → Response
  (Same pattern, just different API. No container needed.)

With Agent SDK:
  User → Next.js API Route → Vercel Sandbox → Agent SDK → Response
  (API route creates sandbox, runs agent inside it, returns result)

  OR

  User → Next.js API Route → External Container (Modal/Fly/E2B) → Agent SDK → Response
  (API route calls external service hosting the agent)
```

### Key Consideration

**The Standard SDK does NOT need container sandboxing.** It's a simple API call — same as the current OpenAI fetch pattern. Container deployment is only needed for the Agent SDK.

This means:
- **Phase 1 (Standard SDK migration)**: Zero infrastructure change. Deploy on Vercel as-is.
- **Phase 2 (Agent SDK)**: Requires either Vercel Sandbox integration or external container service.

**Cost note**: Container costs are dominated by API token usage, not compute. Containers cost roughly $0.05/hour minimum. For a demo with low traffic, this is negligible.

---

## P. Structured Outputs

### The Problem

Currently, `ai_judgment` generation relies on prompting Claude to return JSON and then manually parsing it:

```typescript
// Current pattern: fragile
const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
const judgment = JSON.parse(text);  // Can throw if Claude returns non-JSON
// Then manually validate with Zod... or hope for the best
```

### Agent SDK: outputFormat

The Agent SDK provides `outputFormat` — a schema-validated structured output mode. The agent uses tools as needed, then returns validated JSON matching your schema:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// 1. Define the schema with Zod
const AIJudgmentSchema = z.object({
  document_type: z.enum([
    "invoice", "contract", "receipt", "meeting_notes",
    "report", "proposal", "letter", "spreadsheet", "other"
  ]),
  summary: z.string().describe("2-3 sentence summary of the document"),
  purpose: z.string().describe("Why this document exists"),
  key_entities: z.object({
    people: z.array(z.string()),
    organizations: z.array(z.string()),
    amounts: z.array(z.string()),
    dates: z.array(z.string()),
  }),
  tags: z.array(z.string()).describe("Search-friendly tags"),
  language: z.enum(["ja", "en", "mixed"]),
  confidence: z.number().min(0).max(1),
});

type AIJudgment = z.infer<typeof AIJudgmentSchema>;

// 2. Convert to JSON Schema
const jsonSchema = z.toJSONSchema(AIJudgmentSchema);

// 3. Query with outputFormat
for await (const message of query({
  prompt: `Classify this document:\n\nFile: ${fileName}\n\nContent:\n${textContent.slice(0, 3000)}`,
  options: {
    model: "haiku",  // Cheap model for classification
    maxTurns: 1,     // Single turn, no tool calls needed
    outputFormat: {
      type: "json_schema",
      schema: jsonSchema,
    },
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    // 4. Guaranteed structured output — already validated against schema
    const judgment = message.structured_output as AIJudgment;

    // Optional: extra Zod validation for type safety
    const parsed = AIJudgmentSchema.safeParse(judgment);
    if (parsed.success) {
      await saveAIJudgment(documentId, parsed.data);
    }
  } else if (message.type === "result" && message.subtype === "error_max_structured_output_retries") {
    // Agent couldn't produce valid output after multiple attempts
    console.error("AI judgment generation failed:", message.errors);
  }
}
```

### How It Works

1. The agent receives the prompt and schema
2. The agent can use tools if needed (e.g., read a file, search for context)
3. After tool use, the agent generates a JSON response
4. The SDK validates the response against the schema
5. If invalid, the SDK automatically retries (up to a limit)
6. The validated result appears in `message.structured_output`

### ResultMessage Subtypes

| Subtype | Meaning |
|---------|---------|
| `success` | Output generated and validated successfully |
| `error_max_structured_output_retries` | Agent couldn't produce valid output after multiple attempts |
| `error_max_turns` | Max turns reached before producing output |
| `error_during_execution` | Runtime error during agent execution |
| `error_max_budget_usd` | Budget exceeded |

### Standard SDK Alternative

The standard Anthropic SDK does not have `outputFormat`. You'd continue with the current pattern:

```typescript
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 500,
  messages: [{
    role: "user",
    content: `Return ONLY valid JSON matching this schema: ${JSON.stringify(jsonSchema)}\n\n${documentContent}`,
  }],
});

const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
const parsed = AIJudgmentSchema.safeParse(JSON.parse(text));
if (!parsed.success) {
  // Manual retry or fallback
}
```

This works but is fragile — Claude might include markdown code fences, extra text, or invalid JSON. The Agent SDK's `outputFormat` eliminates this entire class of errors.

### EB-FILEMG Application

**Primary use case**: Replace manual `JSON.parse` + Zod validation for `ai_judgment` generation with guaranteed structured output.

**Before** (fragile):
```
Prompt → Claude returns text → JSON.parse (may throw) → Zod validate (may fail) → save
```

**After** (robust):
```
Prompt + outputFormat → Agent SDK validates internally → structured_output guaranteed → save
```

**Trade-off**: Requires Agent SDK (with container deployment) instead of a simple API call. For `ai_judgment` generation during file ingestion (a background task, not latency-sensitive), this is acceptable. For the chat API route (latency-sensitive), the manual approach with the standard SDK may be preferable.

---

## Summary: OpenAI vs Anthropic Ecosystem

| Dimension | Current (OpenAI) | Anthropic Ecosystem |
|-----------|-----------------|---------------------|
| **Chat SDK** | Raw fetch (no SDK) | `@anthropic-ai/sdk` or `@anthropic-ai/claude-agent-sdk` |
| **Chat Model** | gpt-4o-mini | claude-haiku-4-5 (cheap) / claude-sonnet-4-5 (quality) |
| **Vision** | Separate API call to gpt-4.1-mini | Built into ALL Claude models |
| **Embeddings** | text-embedding-3-small (1536d) | Voyage AI voyage-3.5 (1024d) |
| **Tool Format** | `type: "function"` + `parameters` | `name` + `input_schema` |
| **Tool Execution** | Manual two-pass, sequential | Agent SDK loop (auto) or manual loop with native parallel tool_use |
| **Multi-Step** | Not supported (tool_choice: "none" on 2nd call) | Automatic (agent loop) or manual loop |
| **Streaming** | Raw SSE via fetch | SDK `.stream()` or Agent SDK AsyncGenerator |
| **Prompt Format** | Flat numbered rules | XML tags (`<role>`, `<rules>`, etc.) |
| **Extended Thinking** | Not available | `thinking` option (Claude Opus/Sonnet) |
| **Sessions** | Manual (Supabase messages) | Agent SDK built-in + Supabase |
| **Hooks/Lifecycle** | None | PreToolUse, PostToolUse, Stop, etc. |
| **Cost (chat)** | ~$0.15/MTok input, ~$0.60/MTok output (4o-mini) | ~$0.80/MTok in, ~$4/MTok out (Haiku) or ~$3/MTok in, ~$15/MTok out (Sonnet) |
| **Cost (vision)** | ~$0.003-0.01/image | ~$0.0013/image (Haiku) |
| **Cost (embed)** | ~$0.02/MTok (3-small) | Voyage pricing (varies) |
| **Context Window** | 128K (4o-mini) | 200K (all Claude models) |
| **Multilingual** | Good | Excellent (Claude + Voyage AI) |
| **Subagents** | None | Agent SDK: parallel task delegation, per-agent model/tools |
| **Skills** | None | Filesystem-based workflow packages (SKILL.md) |
| **Structured Output** | JSON mode / response_format | Agent SDK `outputFormat` with Zod + auto-retry |
| **Input Modes** | Single request/response | Streaming input (persistent session) or single message |
| **Hosting** | Serverless (any) | Standard SDK: serverless; Agent SDK: container required |
| **MCP Support** | None (custom function calling) | stdio, HTTP/SSE, SDK (in-process) transports |

### Key Decision Points

1. **Agent SDK vs Standard SDK**: Agent SDK gives you multi-step + hooks + sessions for free, but adds latency and complexity. Standard SDK is lighter and more familiar.
2. **Embedding provider**: Keep OpenAI embeddings for demo (hybrid), migrate to Voyage AI for production.
3. **Vision model**: Claude Haiku is cheaper than gpt-4.1-mini and natively integrated — clear win.
4. **Cost**: Claude Haiku is more expensive per token than gpt-4o-mini for chat, but the 200K context window and better reasoning may reduce total calls needed. Vision is cheaper. Need to benchmark total cost per conversation, not per token.
