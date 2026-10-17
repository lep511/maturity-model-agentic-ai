// Read-only JSON API over the Agentic AI Lens self-assessment content.
// Single entry point (api/index.mjs) with a Web-standard fetch handler; every
// /api/* path is rewritten to it (see vercel.json) and routed here by pathname.
// Shapes, lookups and filters live in lib/api/shapes.mjs and are shared with
// the MCP server (lib/mcp/server.mjs).

import { loadData, readGuidance } from './data.mjs';
import { buildOpenApi } from './openapi.mjs';
import {
  lower, normId, requestOrigin, paginate, project, findPillar, findRoadmap,
  shapeItem, shapeFocusArea, shapePillar, shapeRoadmap, filterItems, filterFocusAreas,
} from './shapes.mjs';

export const API_VERSION = '1';
const CACHE_OK = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

const ENDPOINTS = [
  { path: '/api', description: 'API index: lens metadata, counts and endpoint list' },
  { path: '/api/openapi.json', description: 'OpenAPI 3.1 description of this API' },
  { path: '/api/lens', description: 'Lens metadata: abstract, design principles, pillars, roadmap, definitions' },
  { path: '/api/pillars', description: 'The six pillars with counts' },
  { path: '/api/pillars/{slug}', description: 'One pillar with its design principles and focus areas' },
  { path: '/api/focus-areas', description: 'The 41 focus areas (filters: pillar, roadmap, expand=1)' },
  { path: '/api/focus-areas/{id}', description: 'One focus area: question, capability intent, maturity levels, common issues, best practices' },
  { path: '/api/best-practices', description: 'The 150 best practices (filters: pillar, focus_area, risk, roadmap, q, fields, limit, offset)' },
  { path: '/api/best-practices/{id}', description: 'One best practice (include=guidance embeds the guidance markdown)' },
  { path: '/api/best-practices/{id}/guidance', description: 'Condensed implementation guidance as text/markdown (format=json for JSON)' },
  { path: '/api/roadmap', description: 'The Lens roadmap reading paths with their focus areas' },
  { path: '/api/roadmap/{id}', description: 'One reading path with its focus areas and best practices' },
  { path: '/api/definitions', description: 'Glossary of Lens terms (filter: q)' },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function respond(body, { status = 200, headers = {}, pretty = false } = {}) {
  const text = JSON.stringify(body, null, pretty ? 2 : 0);
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? CACHE_OK : 'no-store',
      'X-Api-Version': API_VERSION,
      ...CORS,
      ...headers,
    },
  });
}

function fail(status, code, message, extra = {}, pretty = false) {
  return respond({ error: { code, message, ...extra } }, { status, pretty });
}

// ── handlers ─────────────────────────────────────────────────────────────────
function handleIndex(data, origin, pretty) {
  return respond({
    name: 'AWS Well-Architected Agentic AI Lens Self-Assessment API',
    version: API_VERSION,
    description: 'Read-only API over the condensed content of the AWS Well-Architected Agentic AI Lens. Unofficial study aid; always refer to the official documentation.',
    lens: { title: data.lens.title, published: data.lens.published, doc_url: data.lens.doc_url, custom_lens_json_url: data.lens.custom_lens_json_url },
    counts: data.counts,
    endpoints: ENDPOINTS.map(e => ({ ...e, url: `${origin}${e.path}` })),
    openapi: `${origin}/api/openapi.json`,
    mcp: { url: `${origin}/mcp`, transport: 'streamable-http', description: 'Model Context Protocol server over the same content (tools, resources, prompts)' },
    app: origin,
  }, { pretty });
}

async function handleGuidance(data, item, params) {
  let markdown;
  try { markdown = await readGuidance(item); }
  catch { return fail(404, 'guidance_not_found', `No guidance file for ${item.id}`); }
  if (params.get('format') === 'json') {
    return respond({ id: item.id, title: item.recommendation, doc_url: item.doc_url, markdown }, { pretty: params.has('pretty') });
  }
  return new Response(markdown, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': CACHE_OK, 'X-Api-Version': API_VERSION, ...CORS },
  });
}

export async function handleRequest(request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const pretty = params.has('pretty');
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (method !== 'GET' && method !== 'HEAD') {
    return respond({ error: { code: 'method_not_allowed', message: `${method} is not supported; this API is read-only`, allow: 'GET, HEAD, OPTIONS' } },
      { status: 405, headers: { Allow: 'GET, HEAD, OPTIONS' }, pretty });
  }

  let data;
  try { data = await loadData(); }
  catch (err) { console.error('Lens API: failed to load data', err); return fail(500, 'data_unavailable', 'The Lens content could not be loaded'); }

  const origin = requestOrigin(request, url);
  let p = url.pathname.replace(/\/+$/, '');
  if (p.startsWith('/api')) p = p.slice(4);
  if (p === '' || p === '/index') p = '/';
  const seg = p.split('/').filter(Boolean).map(s => decodeURIComponent(s));

  try {
    if (p === '/') return handleIndex(data, origin, pretty);
    if (p === '/openapi.json') return respond(buildOpenApi(origin, API_VERSION, data), { pretty: true });
    if (p === '/lens') return respond({ ...data.lens, links: { self: `${origin}/api/lens`, docs: data.lens.doc_url } }, { pretty });

    if (seg[0] === 'pillars') {
      if (seg.length === 1) return respond({ count: data.pillars.length, items: data.pillars.map(x => shapePillar(data, x, origin)) }, { pretty });
      if (seg.length === 2) {
        const pil = findPillar(data, seg[1]);
        return pil ? respond(shapePillar(data, pil, origin, { detail: true }), { pretty })
                   : fail(404, 'pillar_not_found', `Unknown pillar '${seg[1]}'`, { valid: data.pillars.map(x => x.slug) }, pretty);
      }
    }

    if (seg[0] === 'focus-areas') {
      if (seg.length === 1) {
        const { list, errors } = filterFocusAreas(data, params);
        if (errors.length) return fail(400, 'invalid_filter', errors.join('; '), {}, pretty);
        const expand = params.has('expand') && params.get('expand') !== '0';
        return respond({ count: list.length, items: list.map(fa => shapeFocusArea(data, fa, origin, { expand })) }, { pretty });
      }
      if (seg.length === 2) {
        const fa = data.faById.get(normId(seg[1]));
        if (!fa) return fail(404, 'focus_area_not_found', `Unknown focus area '${seg[1]}'`, {}, pretty);
        const out = shapeFocusArea(data, fa, origin, { expand: true });
        out.best_practices_detail = (fa.best_practices || []).map(id => data.itemsById.get(id)).filter(Boolean).map(it => shapeItem(data, it, origin));
        return respond(out, { pretty });
      }
    }

    if (seg[0] === 'best-practices') {
      if (seg.length === 1) {
        const { list, errors } = filterItems(data, params);
        if (errors.length) return fail(400, 'invalid_filter', errors.join('; '), {}, pretty);
        const page = paginate(list, params);
        const fields = params.get('fields');
        return respond({
          total: page.total, count: page.items.length, offset: page.offset, limit: page.limit,
          items: page.items.map(it => project(shapeItem(data, it, origin), fields)),
        }, { pretty });
      }
      const item = data.itemsById.get(normId(seg[1]));
      if (!item) return fail(404, 'best_practice_not_found', `Unknown best practice '${seg[1]}'`, {}, pretty);
      if (seg.length === 2) {
        const out = shapeItem(data, item, origin);
        if (params.get('include') === 'guidance') {
          try { out.guidance_markdown = await readGuidance(item); } catch { out.guidance_markdown = null; }
        }
        return respond(out, { pretty });
      }
      if (seg.length === 3 && seg[2] === 'guidance') return handleGuidance(data, item, params);
    }

    if (seg[0] === 'roadmap') {
      const paths = data.lens.roadmap || [];
      if (seg.length === 1) return respond({ count: paths.length, items: paths.map(r => shapeRoadmap(data, r, origin)) }, { pretty });
      if (seg.length === 2) {
        const r = findRoadmap(data, seg[1]);
        return r ? respond(shapeRoadmap(data, r, origin, { detail: true }), { pretty })
                 : fail(404, 'roadmap_not_found', `Unknown roadmap path '${seg[1]}'`, { valid: paths.map(x => x.id) }, pretty);
      }
    }

    if (seg[0] === 'definitions' && seg.length === 1) {
      const q = lower(params.get('q') || '').trim();
      const defs = (data.lens.definitions || []).filter(d => !q || lower(d.term).includes(q) || lower(d.definition).includes(q));
      return respond({ count: defs.length, items: defs }, { pretty });
    }

    return fail(404, 'not_found', `No endpoint for ${url.pathname}`, { endpoints: ENDPOINTS.map(e => `${origin}${e.path}`) }, pretty);
  } catch (err) {
    console.error('Lens API: unhandled error', err);
    return fail(500, 'internal_error', 'Unexpected error while handling the request');
  }
}
