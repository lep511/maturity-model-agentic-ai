#!/usr/bin/env node
// Offline smoke test for the read-only Lens API (lib/api). Runs the router
// in-process against the generated content; no network or Vercel needed.
//   node tools/api_smoke_test.mjs
import { handleRequest } from '../lib/api/router.mjs';

let passes = 0, failures = 0;
const assert = (cond, msg) => { if (cond) passes++; else { failures++; console.error('ASSERT FAIL:', msg); } };
const get = async (path, init = {}) => {
  const res = await handleRequest(new Request('https://example.test' + path, init));
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, body };
};

const idx = await get('/api');
assert(idx.status === 200 && idx.body.counts.best_practices === 150 && idx.body.counts.focus_areas === 41 && idx.body.counts.pillars === 6, 'index counts 6/41/150');
assert(idx.body.counts.risk.High === 90 && idx.body.counts.risk.Medium === 59 && idx.body.counts.risk.Low === 1, 'index risk tally 90/59/1');
assert(idx.headers.get('access-control-allow-origin') === '*' && (idx.headers.get('cache-control') || '').includes('s-maxage'), 'CORS and cache headers');
assert((await get('/api/index')).status === 200 && (await get('/api/')).status === 200, '/api/index and trailing slash resolve to the index');

const spec = await get('/api/openapi.json');
assert(spec.status === 200 && spec.body.openapi === '3.1.0' && Object.keys(spec.body.paths).length === 13, `openapi has 13 paths (${Object.keys(spec.body.paths || {}).length})`);

const lens = await get('/api/lens');
assert(lens.status === 200 && lens.body.design_principles.length === 5 && lens.body.roadmap.length === 4 && lens.body.definitions.length > 30, 'lens metadata');

const pillars = await get('/api/pillars');
assert(pillars.status === 200 && pillars.body.count === 6 && pillars.body.items[1].slug === 'security' && pillars.body.items[1].counts.best_practices === 30, 'pillars list');
const sec = await get('/api/pillars/SEC');
assert(sec.status === 200 && sec.body.slug === 'security' && sec.body.focus_areas.length === 9 && sec.body.design_principles.length > 0, 'pillar by abbreviation with principles');
assert((await get('/api/pillars/nope')).status === 404, 'unknown pillar -> 404');

const fas = await get('/api/focus-areas?pillar=cost-optimization');
assert(fas.status === 200 && fas.body.count === 7 && !('maturity_levels' in fas.body.items[0]), 'focus areas by pillar, compact');
const fasX = await get('/api/focus-areas?roadmap=first-agent&expand=1');
assert(fasX.status === 200 && fasX.body.count === 4 && fasX.body.items[0].maturity_levels.length === 5, 'focus areas by roadmap, expanded');
assert((await get('/api/focus-areas?pillar=zzz')).status === 400, 'bad filter -> 400');
const fa = await get('/api/focus-areas/agentsec03');
assert(fa.status === 200 && fa.body.id === 'AGENTSEC03' && fa.body.maturity_levels.length === 5 && fa.body.best_practices_detail.length === 4, 'focus area detail (lowercase id)');

const all = await get('/api/best-practices');
assert(all.status === 200 && all.body.total === 150 && all.body.count === 150 && all.body.items[0].id === 'AGENTOPS01-BP01', 'all best practices');
const page = await get('/api/best-practices?limit=10&offset=145&fields=id,risk');
assert(page.status === 200 && page.body.count === 5 && Object.keys(page.body.items[0]).join() === 'id,risk' && page.body.items[4].id === 'AGENTSUS03-BP04', 'pagination and field projection');
const high = await get('/api/best-practices?pillar=Security&risk=high');
assert(high.status === 200 && high.body.total === 19 && high.body.items.every(i => i.risk === 'High'), `security high-risk = 19 (${high.body.total})`);
const rm = await get('/api/best-practices?roadmap=first-agent');
assert(rm.status === 200 && rm.body.total === 14, `roadmap first-agent = 14 (${rm.body.total})`);
const q = await get('/api/best-practices?q=guardrails&fields=id');
assert(q.status === 200 && q.body.total > 0 && q.body.total < 150, `search guardrails -> ${q.body.total}`);
assert((await get('/api/best-practices?risk=critical')).status === 400, 'invalid risk -> 400');

const bp = await get('/api/best-practices/agentops01_bp01?include=guidance');
assert(bp.status === 200 && bp.body.id === 'AGENTOPS01-BP01' && bp.body.desired_outcome.length === 4 && bp.body.aws_services.length === 4 && bp.body.roadmap.includes('first-agent') && bp.body.guidance_markdown.startsWith('# AGENTOPS01-BP01') && !bp.body.summary.includes('&amp;'), 'best practice detail with guidance (underscore id accepted)');
const low = await get('/api/best-practices/AGENTPERF06-BP03');
assert(low.status === 200 && low.body.risk === 'Low' && low.body.links.docs.endsWith('/agentperf06-bp03.html'), 'the single Low-risk practice');
assert((await get('/api/best-practices/AGENTOPS99-BP01')).status === 404, 'unknown best practice -> 404');

const md = await get('/api/best-practices/AGENTOPS01-BP01/guidance');
assert(md.status === 200 && (md.headers.get('content-type') || '').startsWith('text/markdown') && md.body.includes('## Implementation steps'), 'guidance as markdown');
const mdj = await get('/api/best-practices/AGENTOPS01-BP01/guidance?format=json');
assert(mdj.status === 200 && mdj.body.id === 'AGENTOPS01-BP01' && mdj.body.markdown.includes('Desired outcome'), 'guidance as json');

const road = await get('/api/roadmap');
assert(road.status === 200 && road.body.count === 4 && road.body.items[0].counts.best_practices === 14, 'roadmap list');
const road1 = await get('/api/roadmap/Moving%20to%20production');
assert(road1.status === 200 && road1.body.id === 'production' && road1.body.focus_areas[0].best_practices_detail.length > 0, 'roadmap by label with detail');

const defs = await get('/api/definitions?q=memory');
assert(defs.status === 200 && defs.body.count >= 1 && defs.body.items.some(d => d.term === 'Agent memory'), 'definitions filter');

assert((await get('/api/unknown')).status === 404, 'unknown path -> 404');
assert((await get('/api/best-practices', { method: 'OPTIONS' })).status === 204, 'OPTIONS preflight -> 204');
assert((await get('/api/best-practices', { method: 'POST' })).status === 405, 'POST -> 405');

console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
