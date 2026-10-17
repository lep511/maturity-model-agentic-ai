// Vercel Function serving the MCP server over Streamable HTTP (stateless).
// vercel.json rewrites /mcp here. The SDK builds a fresh McpServer per request
// (no sessions, so any Fluid Compute instance can answer); the Lens content is
// cached per instance by lib/api/data.mjs. Legacy (initialize-based) clients
// are accepted statelessly as well.
import { createMcpHandler } from '@modelcontextprotocol/server';
import { buildServer } from '../lib/mcp/server.mjs';
import { requestOrigin } from '../lib/api/shapes.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Method, Mcp-Name, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

const handler = createMcpHandler(({ requestInfo }) => {
  const origin = requestInfo ? requestOrigin(requestInfo, new URL(requestInfo.url)) : undefined;
  return buildServer({ origin });
}, { onerror: err => console.error('Lens MCP:', err?.message ?? err) });

export async function handleMcpRequest(request) {
  if (request.method.toUpperCase() === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const response = await handler.fetch(request);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch: handleMcpRequest,
};
