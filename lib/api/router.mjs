// Read-only JSON API over the Agentic AI Lens self-assessment content.
// Single entry point (api/index.mjs) with a Web-standard fetch handler; every
// /api/* path is rewritten to it (see vercel.json) and routed here by pathname.

import { loadData, readGuidance } from './data.mjs';
import { buildOpenApi } from './openapi.mjs';

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
const lower = s => String(s ?? '').toLowerCase();
const normId = s => String(s ?? '').trim().toUpperCase().replace(/_/g, '-');
const unescapeHtml = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function parseOutcomes(howToCheck) {
  return String(howToCheck ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('•'))
    .map(l => unescapeHtml(l.replace(/^•\s*/, '')));
}

function splitServices(s) {
  if (!s || s === 'N/A') return [];
  return String(s).split('/').map(x => x.trim()).filter(Boolean);
}

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

function requestOrigin(request, url) {
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

function paginate(list, params) {
  const total = list.length;
  let offset = parseInt(params.get('offset') ?? '0', 10);
  let limit = parseInt(params.get('limit') ?? String(total), 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (!Number.isFinite(limit) || limit < 1) limit = total;
  limit = Math.min(limit, 500);
  return { total, offset, limit, items: list.slice(offset, offset + limit) };
}

function project(obj, fieldsParam) {
  if (!fieldsParam) return obj;
  const keep = new Set(fieldsParam.split(',').map(f => f.trim()).filter(Boolean));
  if (!keep.size) return obj;
  const out = {};
  for (const k of keep) if (k in obj) out[k] = obj[k];
  return out;
}

// ── lookups ──────────────────────────────────────────────────────────────────
function findPillar(data, key) {
  const k = lower(key);
  if (!k) return null;
  return data.pillars.find(p => [p.slug, p.name, p.prefix, p.short, p.abbr].some(v => lower(v) === k)) || null;
}

function findRoadmap(data, key) {
  const k = lower(key);
  if (!k) return null;
  return (data.lens.roadmap || []).find(r => lower(r.id) === k || lower(r.label) === k) || null;
}

// ── shapes ───────────────────────────────────────────────────────────────────
function shapeItem(data, item, origin) {
  const fa = data.faById.get(item.focus_area_id);
  const pillar = data.pillarByName.get(item.pillar);
  return {
    id: item.id,
    title: item.recommendation,
    pillar: item.pillar,
    pillar_slug: pillar?.slug ?? null,
    focus_area_id: item.focus_area_id,
    focus_area: item.focus_area,
    focus_area_question: fa?.question ?? null,
    risk: item.risk,
    aws_services: splitServices(item.aws_service),
    summary: unescapeHtml(item.guidance),
    desired_outcome: parseOutcomes(item.how_to_check),
    roadmap: fa?.roadmap ?? [],
    doc_url: item.doc_url,
    links: {
      self: `${origin}/api/best-practices/${item.id}`,
      guidance: `${origin}/api/best-practices/${item.id}/guidance`,
      focus_area: `${origin}/api/focus-areas/${item.focus_area_id}`,
      pillar: pillar ? `${origin}/api/pillars/${pillar.slug}` : null,
      docs: item.doc_url,
    },
  };
}

function shapeFocusArea(data, fa, origin, { expand = false } = {}) {
  const pillar = data.pillarByName.get(fa.pillar);
  const out = {
    id: fa.id,
    name: fa.name,
    question: fa.question,
    pillar: fa.pillar,
    pillar_slug: pillar?.slug ?? null,
    roadmap: fa.roadmap || [],
    best_practices: fa.best_practices || [],
    counts: data.faCounts.get(fa.id),
    doc_url: fa.doc_url,
    links: {
      self: `${origin}/api/focus-areas/${fa.id}`,
      best_practices: `${origin}/api/best-practices?focus_area=${fa.id}`,
      pillar: pillar ? `${origin}/api/pillars/${pillar.slug}` : null,
      docs: fa.doc_url,
    },
  };
  if (expand) {
    out.intro = fa.intro;
    out.capability_intent = fa.capability_intent;
    out.maturity_levels = fa.maturity_levels;
    out.common_issues = fa.common_issues;
  }
  return out;
}

function shapePillar(data, p, origin, { detail = false } = {}) {
  const out = {
    name: p.name,
    slug: p.slug,
    prefix: p.prefix,
    short: p.short,
    abbr: p.abbr,
    intro: p.intro,
    counts: p.counts,
    focus_areas: (p.focus_areas || []).map(id => {
      const fa = data.faById.get(id);
      return fa ? { id, name: fa.name, question: fa.question } : { id };
    }),
    doc_url: p.doc_url,
    links: {
      self: `${origin}/api/pillars/${p.slug}`,
      focus_areas: `${origin}/api/focus-areas?pillar=${p.slug}`,
      best_practices: `${origin}/api/best-practices?pillar=${p.slug}`,
      docs: p.doc_url,
    },
  };
  if (detail) out.design_principles = p.design_principles || [];
  return out;
}

function shapeRoadmap(data, r, origin, { detail = false } = {}) {
  const focusAreas = (r.focus_areas || []).map(ref => {
    const fa = data.faById.get(ref.id);
    const entry = { id: ref.id, summary: ref.summary, name: fa?.name ?? null, best_practices: fa?.best_practices ?? [] };
    if (detail && fa) entry.best_practices_detail = fa.best_practices.map(id => data.itemsById.get(id)).filter(Boolean).map(it => shapeItem(data, it, origin));
    return entry;
  });
  return {
    id: r.id,
    label: r.label,
    intro: r.intro,
    focus_areas: focusAreas,
    counts: { focus_areas: focusAreas.length, best_practices: focusAreas.reduce((n, f) => n + f.best_practices.length, 0) },
    links: { self: `${origin}/api/roadmap/${r.id}`, best_practices: `${origin}/api/best-practices?roadmap=${r.id}` },
  };
}

// ── filters ──────────────────────────────────────────────────────────────────
function filterItems(data, params) {
  let list = data.items;
  const errors = [];

  if (params.has('pillar')) {
    const p = findPillar(data, params.get('pillar'));
    if (!p) errors.push(`unknown pillar '${params.get('pillar')}'`);
    else list = list.filter(it => it.pillar === p.name);
  }
  if (params.has('focus_area')) {
    const id = normId(params.get('focus_area'));
    if (!data.faById.has(id)) errors.push(`unknown focus_area '${params.get('focus_area')}'`);
    else list = list.filter(it => it.focus_area_id === id);
  }
  if (params.has('risk')) {
    const wanted = params.get('risk').split(',').map(r => lower(r.trim())).filter(Boolean);
    const valid = ['high', 'medium', 'low'];
    const bad = wanted.filter(r => !valid.includes(r));
    if (bad.length) errors.push(`invalid risk '${bad.join(',')}' (use High, Medium or Low)`);
    else list = list.filter(it => wanted.includes(lower(it.risk)));
  }
  if (params.has('roadmap')) {
    const r = findRoadmap(data, params.get('roadmap'));
    if (!r) errors.push(`unknown roadmap '${params.get('roadmap')}'`);
    else list = list.filter(it => (data.faById.get(it.focus_area_id)?.roadmap || []).includes(r.id));
  }
  const q = lower(params.get('q') || '').trim();
  if (q) {
    list = list.filter(it => {
      const fa = data.faById.get(it.focus_area_id);
      return [it.id, it.recommendation, it.guidance, it.how_to_check, it.focus_area, it.aws_service, it.pillar, fa?.question]
        .some(v => lower(v).includes(q));
    });
  }
  return { list, errors };
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
        let list = data.focusAreas;
        const errors = [];
        if (params.has('pillar')) {
          const pil = findPillar(data, params.get('pillar'));
          if (!pil) errors.push(`unknown pillar '${params.get('pillar')}'`); else list = list.filter(fa => fa.pillar === pil.name);
        }
        if (params.has('roadmap')) {
          const r = findRoadmap(data, params.get('roadmap'));
          if (!r) errors.push(`unknown roadmap '${params.get('roadmap')}'`); else list = list.filter(fa => (fa.roadmap || []).includes(r.id));
        }
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
