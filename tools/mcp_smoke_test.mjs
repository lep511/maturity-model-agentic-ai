#!/usr/bin/env node
// Offline smoke test for the MCP server (lib/mcp). Exercises the server three
// ways without network or Vercel: an in-process client over InMemoryTransport,
// the real stdio entry point (mcp/stdio.mjs) as a child process, and the
// stateless Streamable HTTP function (api/mcp.mjs) with raw JSON-RPC for both
// the 2026-07-28 per-request negotiation (Mcp-Method, Mcp-Name and
// MCP-Protocol-Version headers plus _meta) and the legacy initialize handshake.
//   node tools/mcp_smoke_test.mjs
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { buildServer, SERVER_NAME } from '../lib/mcp/server.mjs';
import { handleMcpRequest } from '../api/mcp.mjs';

let passes = 0, failures = 0;
const assert = (cond, msg) => { if (cond) passes++; else { failures++; console.error('ASSERT FAIL:', msg); } };
const ORIGIN = 'https://example.test';
const PROTOCOL = '2026-07-28';

// ── in-process client ────────────────────────────────────────────────────────
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = await buildServer({ origin: ORIGIN });
await server.connect(serverTransport);
const client = new Client({ name: 'lens-smoke-test', version: '0.0.0' }, { capabilities: {} });
await client.connect(clientTransport);

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  return { ...res, data: res.structuredContent, text: res.content?.find(c => c.type === 'text')?.text ?? '' };
};

const tools = await client.listTools();
const toolNames = tools.tools.map(t => t.name).sort();
assert(toolNames.length === 10, `10 tools registered (${toolNames.length}: ${toolNames.join(',')})`);
assert(tools.tools.every(t => t.annotations?.readOnlyHint === true && t.annotations?.openWorldHint === false), 'every tool is annotated read-only and closed-world');
assert(tools.tools.every(t => t.description && t.inputSchema?.type === 'object'), 'every tool has a description and an object input schema');

const pillars = await call('list_pillars');
assert(pillars.data.count === 6 && pillars.data.items[1].slug === 'security' && pillars.data.items[1].counts.best_practices === 30, 'list_pillars -> 6 pillars, security has 30 practices');
assert(pillars.data.items[0].links.self === `${ORIGIN}/api/pillars/operational-excellence`, 'links use the configured origin');
const sec = await call('get_pillar', { pillar: 'SEC' });
assert(sec.data.slug === 'security' && sec.data.focus_areas.length === 9 && sec.data.design_principles.length > 0, 'get_pillar by abbreviation with design principles');
const badPillar = await call('get_pillar', { pillar: 'nope' });
assert(badPillar.isError === true && Array.isArray(badPillar.data.error.valid), 'unknown pillar -> isError with valid slugs');

const fas = await call('list_focus_areas', { pillar: 'cost-optimization' });
assert(fas.data.count === 7 && !('maturity_levels' in fas.data.items[0]), 'list_focus_areas by pillar, compact');
const fasX = await call('list_focus_areas', { roadmap: 'first-agent', expand: true });
assert(fasX.data.count === 4 && fasX.data.items[0].maturity_levels.length === 5, 'list_focus_areas by roadmap, expanded');
assert((await call('list_focus_areas', { pillar: 'zzz' })).isError === true, 'bad filter -> isError');
const fa = await call('get_focus_area', { id: 'agentsec03' });
assert(fa.data.id === 'AGENTSEC03' && fa.data.maturity_levels.length === 5 && fa.data.best_practices_detail.length === 4, 'get_focus_area (lowercase id) with maturity levels and practices');

const all = await call('search_best_practices', { limit: 500 });
assert(all.data.total === 150 && all.data.count === 150 && all.data.items[0].id === 'AGENTOPS01-BP01', 'search_best_practices without filters -> 150');
const dflt = await call('search_best_practices', {});
assert(dflt.data.total === 150 && dflt.data.count === 25 && dflt.data.limit === 25, 'default page size is 25');
const high = await call('search_best_practices', { pillar: 'Security', risk: 'high', limit: 100 });
assert(high.data.total === 19 && high.data.items.every(i => i.risk === 'High'), `security high-risk = 19 (${high.data.total})`);
const rm = await call('search_best_practices', { roadmap: 'first-agent', fields: 'id,risk', limit: 100 });
assert(rm.data.total === 14 && Object.keys(rm.data.items[0]).join() === 'id,risk', `roadmap first-agent = 14 with field projection (${rm.data.total})`);
const q = await call('search_best_practices', { q: 'guardrails', fields: 'id' });
assert(q.data.total > 0 && q.data.total < 150, `search guardrails -> ${q.data.total}`);
assert((await call('search_best_practices', { risk: 'critical' })).isError === true, 'invalid risk -> isError');

const bp = await call('get_best_practice', { id: 'agentops01_bp01', include_guidance: true });
assert(bp.data.id === 'AGENTOPS01-BP01' && bp.data.desired_outcome.length === 4 && bp.data.aws_services.length === 4 && bp.data.guidance_markdown.startsWith('# AGENTOPS01-BP01') && !bp.data.summary.includes('&amp;'), 'get_best_practice normalises the id and embeds guidance');
assert((await call('get_best_practice', { id: 'AGENTOPS99-BP01' })).isError === true, 'unknown best practice -> isError');
const steps = await call('get_implementation_guidance', { id: 'AGENTOPS01-BP01' });
assert(steps.text.startsWith('**AGENTOPS01-BP01**') && steps.text.includes('## Implementation steps') && !steps.text.includes('Desired outcome'), 'implementation steps section only');
const full = await call('get_implementation_guidance', { id: 'AGENTOPS01-BP01', section: 'full' });
assert(full.text.startsWith('# AGENTOPS01-BP01') && full.text.includes('Desired outcome'), 'full guidance file');

const road = await call('get_roadmap');
assert(road.data.count === 4 && road.data.items[0].counts.best_practices === 14, 'get_roadmap lists 4 paths');
const road1 = await call('get_roadmap', { roadmap: 'Moving to production' });
assert(road1.data.id === 'production' && road1.data.focus_areas[0].best_practices_detail.length > 0, 'get_roadmap by label with detail');
const defs = await call('lookup_definition', { q: 'memory' });
assert(defs.data.count >= 1 && defs.data.items.some(d => d.term === 'Agent memory'), 'lookup_definition');

// score_assessment: CSV in the exact format exportCSV() in js/app.js writes.
const csv = [
  'ID,Pillar,Focus Area,Best Practice,Risk,AWS Services,Alignment,Score,Comments',
  'AGENTOPS01-BP01,Operational excellence,AGENTOPS01 x,Establish roles,High,Amazon Bedrock,Fully aligned,100%,"done, with ""quotes"""',
  'AGENTOPS01-BP02,Operational excellence,AGENTOPS01 x,Something,High,N/A,Excluded from analysis,N/A,',
  'AGENTOPS01-BP03,Operational excellence,AGENTOPS01 x,Something else,Medium,N/A,Partially aligned,50%,needs work',
].join('\r\n');
const score = await call('score_assessment', { csv });
assert(Math.abs(score.data.overall_pct - Math.round((1.5 / 149) * 1000) / 10) < 1e-9, `overall coverage = 1.5/149 (${score.data.overall_pct})`);
assert(score.data.counts.assessed === 2 && score.data.counts.excluded === 1 && score.data.counts.unassessed === 147, 'status counts 2/1/147');
const ops01 = score.data.focus_areas.find(f => f.id === 'AGENTOPS01');
const ops01Size = fa.data.id && (await call('get_focus_area', { id: 'AGENTOPS01' })).data.best_practices.length;
assert(ops01.coverage_pct === Math.round((1.5 / (ops01Size - 1)) * 1000) / 10, `AGENTOPS01 coverage = 1.5/(${ops01Size}-1) (${ops01.coverage_pct})`);
assert(score.data.gaps_total === 147 && score.data.gaps.length === 30 && score.data.gaps[0].risk === 'High', 'gaps: 147 unassessed, first page of 30, High first');
assert(!score.data.gaps.some(g => ['AGENTOPS01-BP01', 'AGENTOPS01-BP02', 'AGENTOPS01-BP03'].includes(g.id)), 'scored 50 %, 100 % and excluded items are not gaps');
assert(score.data.unknown_ids.length === 0 && score.data.invalid_scores.length === 0, 'no unknown or invalid rows');
const scoreRows = [{ id: 'agentops01_bp01', score: 75, comment: 'ok' }, { id: 'AGENTOPS01-BP03', score: 0.25 }, { id: 'NOPE-BP01', score: 'na' }, { id: 'AGENTOPS01-BP04', score: 'bad' }];
const score2 = await call('score_assessment', { scores: scoreRows, max_gaps: 150 });
assert(score2.data.unknown_ids.includes('NOPE-BP01') && score2.data.invalid_scores.length === 1 && score2.data.gaps.length === score2.data.gaps_total, 'scores list: unknown id reported, invalid value reported, all gaps returned');
assert(score2.data.gaps.some(g => g.id === 'AGENTOPS01-BP03' && g.score_pct === 25 && g.status === 'assessed'), '25 % scored item is a gap');
assert(!score2.data.gaps.some(g => g.id === 'AGENTOPS01-BP01'), '75 % scored item is not a gap');
assert((await call('score_assessment', { scores: scoreRows, max_gaps: 5 })).data.gaps.length === 5, 'max_gaps honoured');
assert((await call('score_assessment', {})).isError === true, 'score_assessment without input -> isError');
assert((await call('score_assessment', { csv: 'Foo,Bar\n1,2' })).isError === true, 'CSV without ID/Score columns -> isError');

// resources
const templates = await client.listResourceTemplates();
assert(templates.resourceTemplates.length === 4, `4 resource templates (${templates.resourceTemplates.length})`);
const resources = await client.listResources();
assert(resources.resources.length === 1 + 6 + 41 + 150 + 150, `resource list enumerates 348 entries (${resources.resources.length})`);
const lens = await client.readResource({ uri: 'lens://lens' });
assert(JSON.parse(lens.contents[0].text).counts.best_practices === 150 && lens.contents[0].mimeType === 'application/json', 'lens://lens');
const pil = await client.readResource({ uri: 'lens://pillars/security' });
assert(JSON.parse(pil.contents[0].text).focus_areas.length === 9, 'lens://pillars/{slug}');
const faRes = await client.readResource({ uri: 'lens://focus-areas/AGENTSEC03' });
assert(JSON.parse(faRes.contents[0].text).best_practices_detail.length === 4, 'lens://focus-areas/{id}');
const bpRes = await client.readResource({ uri: 'lens://best-practices/AGENTOPS01-BP01' });
assert(JSON.parse(bpRes.contents[0].text).title.length > 0 && bpRes.contents[0].mimeType === 'application/json', 'lens://best-practices/{id} is JSON');
const gRes = await client.readResource({ uri: 'lens://best-practices/AGENTOPS01-BP01/guidance' });
assert(gRes.contents[0].mimeType === 'text/markdown' && gRes.contents[0].text.includes('## Implementation steps'), 'lens://best-practices/{id}/guidance is markdown');
let notFound = false;
try { await client.readResource({ uri: 'lens://best-practices/AGENTOPS99-BP01' }); } catch { notFound = true; }
assert(notFound, 'unknown resource -> error');
const comp = await client.complete({ ref: { type: 'ref/resource', uri: 'lens://focus-areas/{id}' }, argument: { name: 'id', value: 'agentsec0' } });
assert(comp.completion.values.length === 9 && comp.completion.values[0] === 'AGENTSEC01', `resource completion for agentsec0 -> 9 ids (${comp.completion.values.length})`);

// prompts
const prompts = await client.listPrompts();
assert(prompts.prompts.map(p => p.name).sort().join() === 'explain_best_practice,gap_report,review_focus_area', 'three prompts');
const review = await client.getPrompt({ name: 'review_focus_area', arguments: { focus_area_id: 'agentsec03' } });
assert(review.messages[0].role === 'user' && review.messages[0].content.text.includes('AGENTSEC03') && review.messages[0].content.text.includes('Maturity levels'), 'review_focus_area prompt');
const gap = await client.getPrompt({ name: 'gap_report', arguments: { csv } });
assert(gap.messages[0].content.text.includes('Overall coverage') && gap.messages[0].content.text.includes('147 in total') && gap.messages[0].content.text.includes('```csv'), 'gap_report prompt embeds the computed summary and the CSV');
const explain = await client.getPrompt({ name: 'explain_best_practice', arguments: { id: 'AGENTOPS01-BP01' } });
assert(explain.messages[0].content.text.includes('Implementation steps') && explain.messages[0].content.text.includes('agentops01-bp01.html'), 'explain_best_practice prompt embeds guidance and doc link');
const pcomp = await client.complete({ ref: { type: 'ref/prompt', name: 'explain_best_practice' }, argument: { name: 'id', value: 'AGENTPERF06' } });
assert(pcomp.completion.values.includes('AGENTPERF06-BP03'), 'prompt argument completion');
await client.close();

// ── stdio entry point ────────────────────────────────────────────────────────
const stdioClient = new Client({ name: 'lens-smoke-test-stdio', version: '0.0.0' }, { capabilities: {} });
await stdioClient.connect(new StdioClientTransport({ command: process.execPath, args: ['mcp/stdio.mjs'], stderr: 'pipe' }));
const stdioTools = await stdioClient.listTools();
assert(stdioTools.tools.length === 10, 'stdio server lists 10 tools');
const stdioCall = await stdioClient.callTool({ name: 'lookup_definition', arguments: { q: 'guardrail' } });
assert(stdioCall.structuredContent.count >= 1, 'stdio tool call works');
await stdioClient.close();

// ── Streamable HTTP function (stateless) ─────────────────────────────────────
async function rpc(body, headers = {}) {
  const res = await handleMcpRequest(new Request(`${ORIGIN}/mcp`, {
    method: 'POST',
    // 2026-07-28 Streamable HTTP: the Mcp-Method header mirrors the JSON-RPC
    // method and Mcp-Name mirrors params.name (tools, prompts) or params.uri
    // (resources) so intermediaries can route and cache without reading bodies.
    headers: {
      'content-type': 'application/json', accept: 'application/json, text/event-stream',
      'mcp-method': body.method,
      ...(body.params?.name || body.params?.uri ? { 'mcp-name': body.params.name ?? body.params.uri } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  }));
  const ct = res.headers.get('content-type') || '';
  let msg = null;
  if (ct.includes('application/json')) msg = await res.json();
  else if (ct.includes('text/event-stream')) {
    const events = (await res.text()).split('\n').filter(l => l.startsWith('data:')).map(l => JSON.parse(l.slice(5).trim()));
    msg = events.find(m => m.id === body.id) ?? events.at(-1) ?? null;
  }
  return { status: res.status, headers: res.headers, msg };
}
const modernMeta = {
  'io.modelcontextprotocol/protocolVersion': PROTOCOL,
  'io.modelcontextprotocol/clientInfo': { name: 'lens-smoke-test-http', version: '0.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};
const modernHeaders = { 'mcp-protocol-version': PROTOCOL };

const discover = await rpc({ jsonrpc: '2.0', id: 'd1', method: 'server/discover', params: { _meta: modernMeta } }, modernHeaders);
assert(discover.status === 200 && discover.msg?.result?.supportedVersions?.includes(PROTOCOL), `server/discover advertises ${PROTOCOL} (${discover.status} ${JSON.stringify(discover.msg?.result?.supportedVersions)})`);
assert(discover.msg?.result?.capabilities?.tools && discover.msg.result.capabilities.resources && discover.msg.result.capabilities.prompts, 'discover capabilities include tools, resources and prompts');
assert(typeof discover.msg?.result?.instructions === 'string' && discover.msg.result.instructions.includes('AGENTSEC03-BP02'), 'discover returns the server instructions');
assert(discover.msg?.result?._meta?.['io.modelcontextprotocol/serverInfo']?.name === SERVER_NAME, 'discover returns serverInfo');
assert(discover.headers.get('access-control-allow-origin') === '*', 'CORS header on HTTP responses');

const httpTools = await rpc({ jsonrpc: '2.0', id: 't1', method: 'tools/list', params: { _meta: modernMeta } }, modernHeaders);
assert(httpTools.status === 200 && httpTools.msg?.result?.tools?.length === 10, `modern tools/list over HTTP -> 10 tools (${httpTools.status})`);
const httpCall = await rpc({ jsonrpc: '2.0', id: 'c1', method: 'tools/call', params: { name: 'list_pillars', arguments: {}, _meta: modernMeta } }, modernHeaders);
assert(httpCall.status === 200 && httpCall.msg?.result?.structuredContent?.count === 6, 'modern tools/call over HTTP');
const httpRead = await rpc({ jsonrpc: '2.0', id: 'r1', method: 'resources/read', params: { uri: 'lens://pillars/security', _meta: modernMeta } }, modernHeaders);
assert(httpRead.status === 200 && JSON.parse(httpRead.msg?.result?.contents?.[0]?.text ?? '{}').slug === 'security', 'modern resources/read over HTTP');

const legacyInit = await rpc({ jsonrpc: '2.0', id: 'i1', method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-client', version: '0.0.0' } } });
assert(legacyInit.status === 200 && legacyInit.msg?.result?.serverInfo?.name === SERVER_NAME && legacyInit.msg.result.protocolVersion === '2025-11-25', `legacy initialize still answered statelessly (${legacyInit.status} ${JSON.stringify(legacyInit.msg).slice(0, 120)})`);

const unknownMethod = await rpc({ jsonrpc: '2.0', id: 'u1', method: 'lens/unknown', params: { _meta: modernMeta } }, modernHeaders);
assert(unknownMethod.msg?.error || unknownMethod.status >= 400, 'unknown method -> JSON-RPC error, no throw');
const badVersion = await rpc({ jsonrpc: '2.0', id: 'v1', method: 'tools/list', params: { _meta: { ...modernMeta, 'io.modelcontextprotocol/protocolVersion': '2099-01-01' } } }, { 'mcp-protocol-version': '2099-01-01' });
assert(badVersion.msg?.error || badVersion.status >= 400, `unsupported protocol version -> error (${badVersion.status})`);

const preflight = await handleMcpRequest(new Request(`${ORIGIN}/mcp`, { method: 'OPTIONS' }));
assert(preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === '*', 'OPTIONS preflight -> 204 with CORS');

console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
