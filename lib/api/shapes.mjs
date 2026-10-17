// Shared lookups, filters and response shapes for the Lens content.
// Used by the read-only REST API (lib/api/router.mjs) and by the MCP server
// (lib/mcp/server.mjs) so both surfaces return identical structures.

export const lower = s => String(s ?? '').toLowerCase();
export const normId = s => String(s ?? '').trim().toUpperCase().replace(/_/g, '-');
export const unescapeHtml = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function parseOutcomes(howToCheck) {
  return String(howToCheck ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('•'))
    .map(l => unescapeHtml(l.replace(/^•\s*/, '')));
}

export function splitServices(s) {
  if (!s || s === 'N/A') return [];
  return String(s).split('/').map(x => x.trim()).filter(Boolean);
}

// Public origin of the deployment, honouring the proxy headers Vercel sets.
export function requestOrigin(request, url) {
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

export function paginate(list, params) {
  const total = list.length;
  let offset = parseInt(params.get('offset') ?? '0', 10);
  let limit = parseInt(params.get('limit') ?? String(total), 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (!Number.isFinite(limit) || limit < 1) limit = total;
  limit = Math.min(limit, 500);
  return { total, offset, limit, items: list.slice(offset, offset + limit) };
}

export function project(obj, fieldsParam) {
  if (!fieldsParam) return obj;
  const keep = new Set(fieldsParam.split(',').map(f => f.trim()).filter(Boolean));
  if (!keep.size) return obj;
  const out = {};
  for (const k of keep) if (k in obj) out[k] = obj[k];
  return out;
}

// ── search ───────────────────────────────────────────────────────────────────
// Free-text search for q: every whitespace- or comma-separated word must appear
// (case-insensitive substring) in the item's texts, in any order. The rank
// says where the words matched (title 3, the item's own fields 2, only with
// the guidance markdown 1, doubled) plus 1 when the whole phrase appears; ties
// keep Lens order. 0 means no match.
export const searchTokens = q => lower(q).split(/[\s,]+/).filter(Boolean);

export function searchRank(item, tokens, phrase) {
  const t = item._search;
  if (!t) return 0;
  const every = text => tokens.every(tok => text.includes(tok));
  const base = every(t.title) ? 3 : every(t.fields) ? 2 : every(t.all) ? 1 : 0;
  return base ? base * 2 + (t.all.includes(phrase) ? 1 : 0) : 0;
}

export function rankBySearch(items, q) {
  const phrase = lower(q).trim();
  const tokens = searchTokens(phrase);
  return items.map(it => [searchRank(it, tokens, phrase), it]).filter(([r]) => r > 0).sort((a, b) => b[0] - a[0]).map(([, it]) => it);
}

// ── lookups ──────────────────────────────────────────────────────────────────
export function findPillar(data, key) {
  const k = lower(key);
  if (!k) return null;
  return data.pillars.find(p => [p.slug, p.name, p.prefix, p.short, p.abbr].some(v => lower(v) === k)) || null;
}

export function findRoadmap(data, key) {
  const k = lower(key);
  if (!k) return null;
  return (data.lens.roadmap || []).find(r => lower(r.id) === k || lower(r.label) === k) || null;
}

// ── shapes ───────────────────────────────────────────────────────────────────
export function shapeItem(data, item, origin) {
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

export function shapeFocusArea(data, fa, origin, { expand = false } = {}) {
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

export function shapePillar(data, p, origin, { detail = false } = {}) {
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

export function shapeRoadmap(data, r, origin, { detail = false } = {}) {
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
// Both filters take URLSearchParams (the REST query string, or one built from
// MCP tool arguments) and return { list, errors }; errors are human-readable.
export function filterItems(data, params) {
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
  if (q) list = rankBySearch(list, q);
  return { list, errors };
}

export function filterFocusAreas(data, params) {
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
  return { list, errors };
}
