#!/usr/bin/env node
// Probe of a deployed MCP endpoint (production by default). Runs after
// `vercel --prod` and daily from .github/workflows/check-mcp-production.yml;
// unlike tools/mcp_smoke_test.mjs it talks to the real deployment, so it
// catches bundling (includeFiles), routing and runtime problems the in-process
// tests cannot see. No dependencies: Node 24 fetch only.
//   node tools/mcp_probe.mjs [https://host]
// Preview deployments are protected by Vercel Authentication; set
// VERCEL_PROTECTION_BYPASS to the project's bypass secret to probe one.

const base = (process.argv[2] || 'https://agentic-ai-lens-assessment.vercel.app').replace(/\/+$/, '');
const PROTOCOL = '2026-07-28';
const META = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL,
  'io.modelcontextprotocol/clientInfo': { name: 'lens-mcp-probe', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};
const EXTRA = process.env.VERCEL_PROTECTION_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_PROTECTION_BYPASS } : {};

let passes = 0, failures = 0;
const assert = (cond, msg) => { if (cond) { passes++; console.log('ok   ', msg); } else { failures++; console.error('FAIL ', msg); } };

async function rpc(method, params = {}, name) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': PROTOCOL, 'mcp-method': method, ...EXTRA };
  if (name) headers['mcp-name'] = name;
  const started = performance.now();
  const res = await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: META } }) });
  const text = await res.text();
  const ms = Math.round(performance.now() - started);
  let msg = null;
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) {
    const events = text.split('\n').filter(l => l.startsWith('data:')).map(l => JSON.parse(l.slice(5).trim()));
    msg = events.find(m => m.id === 1) ?? events.at(-1) ?? null;
  } else if (text) {
    try { msg = JSON.parse(text); } catch { msg = null; }
  }
  return { status: res.status, headers: res.headers, result: msg?.result, error: msg?.error, bytes: text.length, ms };
}

console.log(`Probing ${base}`);
try {
  const get = await fetch(`${base}/mcp`, { headers: EXTRA });
  assert(get.status === 405, `GET /mcp -> 405 (${get.status})`);

  const d = await rpc('server/discover');
  assert(d.status === 200 && d.result?.supportedVersions?.includes(PROTOCOL), `server/discover advertises ${PROTOCOL} (${d.status}, ${d.ms} ms)`);
  assert(d.result?.capabilities?.tools && d.result.capabilities.resources && d.result.capabilities.prompts && typeof d.result.instructions === 'string', 'capabilities and instructions present');
  assert(d.headers.get('access-control-allow-origin') === '*', 'CORS header present');

  const t = await rpc('tools/list');
  const tools = t.result?.tools ?? [];
  assert(tools.length === 11, `tools/list -> 11 tools (${tools.length}, ${t.bytes} bytes)`);
  assert(tools.every(x => x.annotations?.readOnlyHint === true), 'every tool is read-only');
  assert(tools.find(x => x.name === 'export_assessment_csv')?.outputSchema?.properties?.csv?.type === 'string', 'export_assessment_csv declares csv in its outputSchema');

  const r = await rpc('resources/list');
  assert(r.result?.resources?.length === 49, `resources/list -> 49 entries (${r.result?.resources?.length}, ${r.bytes} bytes)`);
  const rt = await rpc('resources/templates/list');
  assert(rt.result?.resourceTemplates?.length === 4, `4 resource templates (${rt.result?.resourceTemplates?.length})`);
  const p = await rpc('prompts/list');
  assert(p.result?.prompts?.length === 3, `3 prompts (${p.result?.prompts?.length})`);

  const pillars = await rpc('tools/call', { name: 'list_pillars', arguments: {} }, 'list_pillars');
  assert(pillars.result?.structuredContent?.count === 6, `list_pillars -> 6 pillars (${pillars.ms} ms)`);
  const steps = await rpc('tools/call', { name: 'get_implementation_guidance', arguments: { id: 'AGENTSEC03-BP02' } }, 'get_implementation_guidance');
  assert(steps.result?.content?.[0]?.text?.includes('## Implementation steps'), 'guidance files are bundled (get_implementation_guidance)');
  const search = await rpc('tools/call', { name: 'search_best_practices', arguments: { q: 'prompt injection', fields: 'id' } }, 'search_best_practices');
  assert(search.result?.structuredContent?.total > 1, `search works (${search.result?.structuredContent?.total} results)`);
  const exp = await rpc('tools/call', { name: 'export_assessment_csv', arguments: { columns: 'minimal' } }, 'export_assessment_csv');
  assert(typeof exp.result?.structuredContent?.csv === 'string' && exp.result.structuredContent.counts?.rows === 150, 'export_assessment_csv returns the CSV in structuredContent.csv');
  const guard = await rpc('tools/call', { name: 'list_focus_areas', arguments: { expand: true } }, 'list_focus_areas');
  assert(guard.result?.isError === true, 'expand without a filter is rejected');
  const read = await rpc('resources/read', { uri: 'lens://pillars/security' }, 'lens://pillars/security');
  assert(read.result?.contents?.[0]?.mimeType === 'application/json', 'resources/read works');

  const legacy = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...EXTRA }, body: JSON.stringify({ jsonrpc: '2.0', id: 'i1', method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy', version: '0' } } }) });
  assert(legacy.status === 200 && (await legacy.text()).includes('"serverInfo"'), 'legacy initialize is still answered');

  const api = await fetch(`${base}/api`, { headers: EXTRA });
  const index = api.ok ? await api.json() : null;
  assert(index?.mcp?.url === `${base}/mcp`, `/api advertises the MCP endpoint (${index?.mcp?.url})`);
} catch (err) {
  failures++;
  console.error('FAIL  probe aborted:', err?.message ?? err);
}
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
