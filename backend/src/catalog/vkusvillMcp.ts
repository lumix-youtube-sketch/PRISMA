// Minimal client for VkusVill's official MCP server (published for AI developers):
//   https://mcp.vkusvill.ru/mcp
// Product tools are public (no OAuth): search, details, barcode, analogs.
// Personalized tools (orders, personalized ranking) need OAuth 2.0 + PKCE — not used here.
//
// Transport is MCP Streamable HTTP (JSON-RPC over POST). Responses may come back
// either as application/json or as an SSE stream ("data: {json}") — we handle both.

const MCP_URL = "https://mcp.vkusvill.ru/mcp";
const TIMEOUT_MS = 8000;

let sessionId: string | null = null;
let initialized = false;
let nextId = 1;

interface JsonRpcResult<T = any> { jsonrpc: string; id: number; result?: T; error?: { code: number; message: string } }

async function rpc<T>(method: string, params?: unknown): Promise<T> {
  const id = nextId++;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) sessionId = sid;
    const text = await res.text();
    const payload = parseBody(text);
    if (payload?.error) throw new Error(`MCP ${method} error ${payload.error.code}: ${payload.error.message}`);
    return payload?.result as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Accept raw JSON or an SSE body; return the JSON-RPC envelope with a matching id. */
function parseBody(text: string): JsonRpcResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try { return JSON.parse(trimmed); } catch { /* fall through to SSE */ }
  }
  // SSE: collect `data:` lines, parse each, prefer one carrying a result/error.
  let last: JsonRpcResult | null = null;
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const obj = JSON.parse(data) as JsonRpcResult;
      if (obj.result !== undefined || obj.error !== undefined) last = obj;
    } catch { /* ignore keepalive frames */ }
  }
  return last;
}

async function ensureInit(): Promise<void> {
  if (initialized) return;
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "foodguard", version: "0.1" },
  });
  // Best-effort "initialized" notification (no id, no response expected).
  try {
    await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
  } catch { /* ignore */ }
  initialized = true;
}

/** Call a tool and return its first text-content block parsed as JSON. */
export async function callVkusvillTool<T = any>(name: string, args: Record<string, unknown>): Promise<T> {
  await ensureInit();
  const result = await rpc<{ content: { type: string; text?: string }[] }>("tools/call", { name, arguments: args });
  const block = result?.content?.find((c) => c.type === "text" && c.text);
  if (!block?.text) throw new Error(`VkusVill tool ${name} returned no text content`);
  return JSON.parse(block.text) as T;
}
