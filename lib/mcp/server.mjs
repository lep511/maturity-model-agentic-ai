// MCP server over the Agentic AI Lens self-assessment content.
// Protocol revision 2026-07-28 through the official TypeScript SDK v2
// (@modelcontextprotocol/server); tools, resources and prompts only, no
// deprecated features (roots, sampling, MCP logging). buildServer() is cheap
// enough to run per request because lib/api/data.mjs caches the content per
// process, so the same factory serves stdio (mcp/stdio.mjs) and the stateless
// Streamable HTTP function (api/mcp.mjs). Response shapes derive from
// lib/api/shapes.mjs but are trimmed for a language model: REST hypermedia
// `links` are dropped (doc_url stays) and listings are compact unless the
// caller asks for detail, because every byte returned lands in the model's
// context window.

import { McpServer, ResourceTemplate, ResourceNotFoundError, completable } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { loadData, readGuidance } from '../api/data.mjs';
import {
  lower, normId, paginate, project, findPillar, findRoadmap,
  shapeItem, shapeFocusArea, shapePillar, shapeRoadmap, filterItems, filterFocusAreas,
} from '../api/shapes.mjs';
import { extractMarkdownSection } from '../markdown.mjs';
import { parseScores, scoreAssessment } from './scoring.mjs';
import { COLUMN_PRESETS, buildCsvRows, projectColumns, csvText, csvFilename } from '../csv.mjs';

export const SERVER_NAME = 'agentic-ai-lens';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_ORIGIN = 'https://agentic-ai-lens-assessment.vercel.app';

// Every tool is a pure read over immutable content.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// The content only changes with a deployment, so clients may cache resources.
const CACHE_HINT = { ttlMs: 24 * 60 * 60 * 1000, cacheScope: 'public' };
const JSON_MIME = 'application/json';
const MD_MIME = 'text/markdown';

// Fields kept by default in listings (search results) and in the practices
// embedded in focus-area and roadmap detail. Full records are one call away.
const LIST_FIELDS = 'id,title,risk,focus_area_id,pillar_slug';
const EMBED_FIELDS = 'id,title,risk,summary,doc_url';
// Full records are about 3-4 KB each, so detail pages are capped; compact
// listings (150 bytes each) and `fields` projections keep the normal limit.
const DETAIL_LIMIT_MAX = 25;

// Remove every `links` object (REST hypermedia) from a response tree.
function stripLinks(value) {
  if (Array.isArray(value)) return value.map(stripLinks);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (k !== 'links') out[k] = stripLinks(v);
    return out;
  }
  return value;
}

// ── result helpers ───────────────────────────────────────────────────────────
const asJson = out => {
  const body = stripLinks(out);
  return { content: [{ type: 'text', text: JSON.stringify(body) }], structuredContent: body };
};
const asMarkdown = text => ({ content: [{ type: 'text', text }] });
const toolError = (message, extra = {}) => ({
  isError: true,
  content: [{ type: 'text', text: message }],
  structuredContent: { error: { message, ...extra } },
});

// URLSearchParams from tool arguments so the REST filters can be reused as-is.
function toParams(args) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    params.set(k, v === true ? '1' : String(v));
  }
  return params;
}

const startsWith = (values, prefix) => {
  const p = lower(prefix);
  return values.filter(v => lower(v).startsWith(p));
};

function instructions(data) {
  const slugs = data.pillars.map(p => p.slug).join(', ');
  const roadmaps = (data.lens.roadmap || []).map(r => `${r.id} (${r.label})`).join(', ');
  return [
    `Unofficial study aid over the ${data.lens.title} (${data.counts.pillars} pillars, ${data.counts.focus_areas} focus areas, ${data.counts.best_practices} best practices), condensed from the AWS documentation published ${data.lens.published}.`,
    `Identifiers: focus areas look like AGENTSEC03, best practices like AGENTSEC03-BP02 (case-insensitive, '_' accepted for '-'). Pillar slugs: ${slugs}. Roadmap reading paths: ${roadmaps}.`,
    'Start with list_pillars or search_best_practices, use get_focus_area for the question, capability intent and the five maturity levels, and get_implementation_guidance for the condensed implementation steps. score_assessment reads the CSV exported by the web app (columns ID, Score, Comments) and returns coverage per pillar and focus area plus the gap list. Scores use the app scale 0 %, 25 %, 50 %, 75 %, 100 % or N/A; other values are snapped to the nearest step and reported in off_scale.',
    'export_assessment_csv turns a scores list (or an older export) into the CSV file the web app imports; the CSV text is the csv field of the structured result (also returned as text content): save it under the suggested file name. The resource lens://export/template.csv is a blank template of the 150 practices.',
    `Responses are sized for a model context. Listings are compact (id, title, risk, focus area); pass detail=true or fields to search_best_practices for full records (about 4 KB each, detail pages capped at ${DETAIL_LIMIT_MAX}). get_focus_area returns about 20 KB (five maturity levels plus its practices); list_focus_areas with expand=true returns about 15 KB per focus area and therefore requires a pillar or roadmap filter. Work one focus area or one guidance at a time instead of fanning out many calls.`,
    `Every record carries doc_url; cite it and refer users to the official documentation (${data.lens.doc_url}) for authoritative wording.`,
  ].join('\n');
}

// ── output schemas ───────────────────────────────────────────────────────────
// Declared for every JSON tool so clients can type the structured result.
// Loose objects: extra fields are allowed, so adding a field to a shape never
// breaks validation; error results (isError) are not validated by the SDK.
// get_implementation_guidance stays text-only: wrapping its markdown in JSON
// would make clients that prefer structuredContent show escaped markdown.
const loose = shape => z.looseObject(shape);
const int = () => z.number().int();
const pct = () => z.number().nullable();
const idTitle = loose({ id: z.string(), title: z.string() });
const OUT = {
  pillars: loose({ count: int(), items: z.array(loose({ slug: z.string(), name: z.string(), counts: loose({ best_practices: int() }) })) }),
  pillar: loose({ slug: z.string(), name: z.string(), focus_areas: z.array(loose({ id: z.string(), name: z.string() })) }),
  focusAreas: loose({ count: int(), items: z.array(loose({ id: z.string(), name: z.string(), pillar: z.string() })) }),
  focusArea: loose({ id: z.string(), name: z.string(), question: z.string(), maturity_levels: z.array(loose({ level: int(), name: z.string() })), best_practices_detail: z.array(idTitle) }),
  search: loose({ total: int(), count: int(), offset: int(), limit: int(), items: z.array(loose({})) }),
  bestPractice: loose({ id: z.string(), title: z.string(), pillar: z.string(), focus_area_id: z.string(), risk: z.string(), doc_url: z.string() }),
  roadmap: z.union([
    loose({ count: int(), items: z.array(loose({ id: z.string(), label: z.string() })) }),
    loose({ id: z.string(), label: z.string(), focus_areas: z.array(loose({ id: z.string() })) }),
  ]),
  definitions: loose({ count: int(), items: z.array(loose({ term: z.string(), definition: z.string() })) }),
  score: loose({
    overall_pct: pct(),
    counts: loose({ total: int(), assessed: int(), unassessed: int(), excluded: int() }),
    pillars: z.array(loose({ slug: z.string(), coverage_pct: pct() })),
    focus_areas: z.array(loose({ id: z.string(), coverage_pct: pct() })),
    gaps_total: int(),
    gaps_by_risk: loose({ High: int(), Medium: int(), Low: int() }),
    gaps: z.array(loose({ id: z.string(), risk: z.string(), status: z.string() })),
    unknown_ids: z.array(z.string()),
    invalid_scores: z.array(loose({ id: z.string() })),
    off_scale: z.array(loose({ id: z.string(), used_pct: int() })),
  }),
};

// ── tools ────────────────────────────────────────────────────────────────────
function registerTools(server, data, origin) {
  const slugs = data.pillars.map(p => p.slug);
  const roadmapIds = (data.lens.roadmap || []).map(r => r.id);
  const pillarArg = z.string().describe(`Pillar slug (${slugs.join(', ')}); the pillar name, prefix (e.g. AGENTSEC) or abbreviation (e.g. SEC) is also accepted`);
  const roadmapArg = z.string().describe(`Roadmap reading path id (${roadmapIds.join(', ')}) or its label`);
  const faIdArg = z.string().describe('Focus area id, e.g. AGENTSEC03');
  const bpIdArg = z.string().describe('Best practice id, e.g. AGENTSEC03-BP02');

  const pillarOr404 = key => findPillar(data, key) || null;
  const unknownPillar = key => toolError(`Unknown pillar '${key}'`, { valid: slugs });
  const unknownFocusArea = key => toolError(`Unknown focus area '${key}'`, { hint: 'Use list_focus_areas to see the 41 ids' });
  const unknownBestPractice = key => toolError(`Unknown best practice '${key}'`, { hint: 'Use search_best_practices to find ids' });

  server.registerTool('list_pillars', {
    title: 'List pillars',
    description: 'The six Well-Architected pillars of the Agentic AI Lens: slug, name, prefix, abbreviation, best-practice counts by risk and the ids and names of their focus areas (compact, about 5 KB). Use get_pillar for the intro, design principles and focus-area questions.',
    inputSchema: z.object({}),
    outputSchema: OUT.pillars,
    annotations: READ_ONLY,
  }, async () => asJson({
    count: data.pillars.length,
    items: data.pillars.map(p => {
      const { intro, focus_areas, ...rest } = shapePillar(data, p, origin);
      return { ...rest, focus_areas: focus_areas.map(({ id, name }) => ({ id, name })) };
    }),
  }));

  server.registerTool('get_pillar', {
    title: 'Get a pillar',
    description: 'One pillar with its design principles, focus areas (id, name, question) and counts.',
    inputSchema: z.object({ pillar: pillarArg }),
    outputSchema: OUT.pillar,
    annotations: READ_ONLY,
  }, async ({ pillar }) => {
    const p = pillarOr404(pillar);
    return p ? asJson(shapePillar(data, p, origin, { detail: true })) : unknownPillar(pillar);
  });

  server.registerTool('list_focus_areas', {
    title: 'List focus areas',
    description: 'The 41 focus areas (question, pillar, roadmap paths, best-practice ids; about 1.5 KB each). Filter by pillar and/or roadmap. expand=true adds intro, capability intent, maturity levels and common issues (about 15 KB per focus area) and requires a pillar or roadmap filter; use get_focus_area for a single one.',
    inputSchema: z.object({
      pillar: pillarArg.optional(),
      roadmap: roadmapArg.optional(),
      expand: z.boolean().default(false).describe('Include intro, capability_intent, maturity_levels and common_issues'),
    }),
    outputSchema: OUT.focusAreas,
    annotations: READ_ONLY,
  }, async ({ pillar, roadmap, expand }) => {
    if (expand && !pillar && !roadmap) {
      return toolError('expand=true needs a pillar or roadmap filter (all 41 expanded focus areas are about 520 KB)', { hint: 'Filter by pillar or roadmap, or call get_focus_area for one id', valid_pillars: slugs, valid_roadmaps: roadmapIds });
    }
    const { list, errors } = filterFocusAreas(data, toParams({ pillar, roadmap }));
    if (errors.length) return toolError(errors.join('; '), { valid_pillars: slugs, valid_roadmaps: roadmapIds });
    return asJson({ count: list.length, items: list.map(fa => shapeFocusArea(data, fa, origin, { expand })) });
  });

  server.registerTool('get_focus_area', {
    title: 'Get a focus area',
    description: 'One focus area in full: question, intro, capability intent, the five maturity levels (Initial to Optimized), common issues and its best practices (id, title, risk, summary, doc_url). About 20 KB; use get_best_practice for a full record.',
    inputSchema: z.object({ id: faIdArg }),
    outputSchema: OUT.focusArea,
    annotations: READ_ONLY,
  }, async ({ id }) => {
    const fa = data.faById.get(normId(id));
    if (!fa) return unknownFocusArea(id);
    const out = shapeFocusArea(data, fa, origin, { expand: true });
    out.best_practices_detail = (fa.best_practices || []).map(bp => data.itemsById.get(bp)).filter(Boolean).map(it => project(shapeItem(data, it, origin), EMBED_FIELDS));
    return asJson(out);
  });

  server.registerTool('search_best_practices', {
    title: 'Search best practices',
    description: `Search and filter the 150 best practices. q is a free-text search: every word must match (case-insensitive substring, any order) in the id, title, summary, desired outcome, focus area, AWS services, pillar or the implementation guidance; results are ordered by relevance (title matches first, then the record, then guidance-only matches), ties in Lens order. Compact by default (id, title, risk, focus_area_id, pillar_slug: about 150 bytes each, a whole pillar fits in one call); detail=true returns full records (summary, desired outcome, AWS services, doc_url: about 4 KB each, pages capped at ${DETAIL_LIMIT_MAX}) and fields picks specific ones. Paginated with limit/offset.`,
    inputSchema: z.object({
      q: z.string().optional().describe('Words to find (all must match, any order), e.g. "prompt injection"'),
      pillar: pillarArg.optional(),
      focus_area: faIdArg.optional(),
      risk: z.string().optional().describe('High, Medium or Low; comma-separated to combine'),
      roadmap: roadmapArg.optional(),
      detail: z.boolean().default(false).describe('Return full records instead of the compact id/title/risk listing'),
      fields: z.string().optional().describe('Comma-separated field names to keep (overrides detail), e.g. id,title,risk,aws_services'),
      limit: z.number().int().min(1).max(500).default(50).describe(`Page size (default 50, max 500 for compact listings and fields projections, ${DETAIL_LIMIT_MAX} with detail=true; the largest pillar has 33 practices)`),
      offset: z.number().int().min(0).max(149).default(0),
    }),
    outputSchema: OUT.search,
    annotations: READ_ONLY,
  }, async ({ q, pillar, focus_area, risk, roadmap, detail, fields, limit, offset }) => {
    const { list, errors } = filterItems(data, toParams({ q, pillar, focus_area, risk, roadmap }));
    if (errors.length) return toolError(errors.join('; '), { valid_pillars: slugs, valid_roadmaps: roadmapIds, valid_risk: ['High', 'Medium', 'Low'] });
    const keep = fields || (detail ? null : LIST_FIELDS);
    const page = paginate(list, toParams({ limit: keep ? limit : Math.min(limit, DETAIL_LIMIT_MAX), offset }));
    return asJson({
      total: page.total, count: page.items.length, offset: page.offset, limit: page.limit,
      items: page.items.map(it => project(shapeItem(data, it, origin), keep)),
    });
  });

  server.registerTool('get_best_practice', {
    title: 'Get a best practice',
    description: 'One best practice: title, pillar, focus area and its question, risk, AWS services, summary, desired outcome, roadmap paths and documentation link. include_guidance=true embeds the condensed implementation guidance (markdown).',
    inputSchema: z.object({
      id: bpIdArg,
      include_guidance: z.boolean().default(false).describe('Embed the guidance markdown as guidance_markdown'),
    }),
    outputSchema: OUT.bestPractice,
    annotations: READ_ONLY,
  }, async ({ id, include_guidance }) => {
    const item = data.itemsById.get(normId(id));
    if (!item) return unknownBestPractice(id);
    const out = shapeItem(data, item, origin);
    if (include_guidance) {
      try { out.guidance_markdown = await readGuidance(item); } catch { out.guidance_markdown = null; }
    }
    return asJson(out);
  });

  server.registerTool('get_implementation_guidance', {
    title: 'Get implementation guidance',
    description: "Condensed implementation guidance for a best practice as markdown. section='steps' (default) returns only the 'Implementation steps' section, as the web app does; section='full' returns the whole guidance file (desired outcome, anti-patterns, benefits, steps, resources).",
    inputSchema: z.object({
      id: bpIdArg,
      section: z.enum(['steps', 'full']).default('steps'),
    }),
    annotations: READ_ONLY,
  }, async ({ id, section }) => {
    const item = data.itemsById.get(normId(id));
    if (!item) return unknownBestPractice(id);
    let markdown;
    try { markdown = await readGuidance(item); } catch { return toolError(`No guidance file for ${item.id}`); }
    if (section === 'full') return asMarkdown(markdown);
    const steps = extractMarkdownSection(markdown, 'Implementation steps');
    const context = `**${item.id}** · ${item.recommendation}\n\n`;
    return asMarkdown(steps ? context + steps.replace(/^#{1,6}\s+/, '## ') : markdown);
  });

  server.registerTool('get_roadmap', {
    title: 'Get roadmap reading paths',
    description: 'The Lens roadmap: reading paths (building your first agent, moving to production, scaling to multi-agent systems, hardening an existing deployment) with their focus areas. Pass roadmap to get one path with its best practices (id, title, risk, summary, doc_url).',
    inputSchema: z.object({ roadmap: roadmapArg.optional() }),
    outputSchema: OUT.roadmap,
    annotations: READ_ONLY,
  }, async ({ roadmap }) => {
    const paths = data.lens.roadmap || [];
    if (!roadmap) return asJson({ count: paths.length, items: paths.map(r => shapeRoadmap(data, r, origin)) });
    const r = findRoadmap(data, roadmap);
    if (!r) return toolError(`Unknown roadmap path '${roadmap}'`, { valid: roadmapIds });
    const out = shapeRoadmap(data, r, origin, { detail: true });
    for (const fa of out.focus_areas) if (fa.best_practices_detail) fa.best_practices_detail = fa.best_practices_detail.map(it => project(it, EMBED_FIELDS));
    return asJson(out);
  });

  server.registerTool('lookup_definition', {
    title: 'Look up a definition',
    description: 'Glossary of Lens terms (agent, tool, guardrail, agent memory, orchestration, ...). Case-insensitive substring match on term and definition; empty query lists every term.',
    inputSchema: z.object({ q: z.string().default('').describe('Term or fragment, e.g. memory') }),
    outputSchema: OUT.definitions,
    annotations: READ_ONLY,
  }, async ({ q }) => {
    const needle = lower(q).trim();
    const defs = (data.lens.definitions || []).filter(d => !needle || lower(d.term).includes(needle) || lower(d.definition).includes(needle));
    return asJson({ count: defs.length, items: defs });
  });

  server.registerTool('score_assessment', {
    title: 'Score an assessment',
    description: "Compute coverage for a self-assessment. Pass the CSV exported by the web app (columns ID, Score, Comments; Score like 75% or N/A) and/or a scores list ({id, score, comment?} with score 0, 0.25, 0.5, 0.75, 1, a percentage, or 'na' for excluded; the list wins for ids present in both). Scores are snapped to the app's 0/25/50/75/100 % scale and the adjustments are listed in off_scale. Same rule as the app: unassessed best practices count as 0 %, excluded ones leave the denominator. Returns overall, per-pillar and per-focus-area coverage, status counts and the gap list (score 25 % or less, or unassessed) ordered by risk.",
    inputSchema: z.object({
      csv: z.string().optional().describe('Raw CSV text exported from the assessment tool'),
      scores: z.array(z.object({
        id: bpIdArg,
        score: z.union([z.number(), z.string()]).describe("0, 0.25, 0.5, 0.75, 1 (or 0-100, '75%', 'na')"),
        comment: z.string().optional(),
      })).optional(),
      max_gaps: z.number().int().min(0).max(150).default(30).describe('Maximum number of gap entries to return'),
    }),
    outputSchema: OUT.score,
    annotations: READ_ONLY,
  }, async ({ csv, scores, max_gaps }) => {
    if (!csv && !(Array.isArray(scores) && scores.length)) return toolError('Provide csv (the exported CSV text) and/or a non-empty scores list');
    let parsed;
    try { parsed = parseScores({ csv, scores }, data); } catch (err) { return toolError(err.message); }
    const report = scoreAssessment(data, parsed.scores, { comments: parsed.comments, maxGaps: max_gaps });
    return asJson({ ...report, unknown_ids: parsed.unknown_ids, invalid_scores: parsed.invalid, off_scale: parsed.off_scale, scoring_rule: 'coverage = mean of applicable scores; unassessed = 0 %, excluded (N/A) removed from the denominator; scores snapped to the 0/25/50/75/100 % scale' });
  });

  server.registerTool('export_assessment_csv', {
    title: 'Export an assessment as CSV',
    description: "Build the CSV file the web app exports and imports from a scores list and/or an older export (pass neither for a blank template; the list wins for ids present in both). The CSV text is returned as the csv field of the structured result and as text content: save it under the suggested filename (<session>-<YYYY-MM-DD>.csv; the importer reads the session name and date from it). Scores are snapped to the app's 0/25/50/75/100 % scale (adjustments listed in off_scale). rows=all writes every practice in scope, assessed only those scored or excluded, gaps those at 25 % or less or unassessed. columns=minimal (ID, Status, Score, Comments) is about 5 KB for 150 rows, review (adds focus area, title, risk) about 18 KB, full (13 columns) about 51 KB; every preset imports into the app.",
    inputSchema: z.object({
      scores: z.array(z.object({
        id: bpIdArg,
        score: z.union([z.number(), z.string()]).describe("0, 0.25, 0.5, 0.75, 1 (or 0-100, '75%', 'na')"),
        comment: z.string().optional(),
      })).optional(),
      csv: z.string().optional().describe('An existing export (any version of the tool) to normalise to the current format'),
      pillar: pillarArg.optional(),
      focus_area: faIdArg.optional(),
      rows: z.enum(['all', 'assessed', 'gaps']).default('all').describe('Which practices to write'),
      columns: z.enum(['full', 'review', 'minimal']).default('review').describe('Column preset'),
      session_name: z.string().default('assessment').describe('Used for the suggested file name'),
    }),
    // Declared so clients can rely on `csv` being present: some of them only
    // surface structuredContent, which would otherwise hide the file.
    outputSchema: z.object({
      csv: z.string().describe('The CSV file contents (UTF-8 with BOM, LF line endings)'),
      filename: z.string().describe('Suggested file name, <session>-<YYYY-MM-DD>.csv'),
      columns: z.array(z.string()),
      counts: z.object({ rows: z.number().int(), assessed: z.number().int(), unassessed: z.number().int(), excluded: z.number().int() }),
      unknown_ids: z.array(z.string()),
      invalid_scores: z.array(z.object({ id: z.string(), score: z.unknown() })),
      off_scale: z.array(z.object({ id: z.string(), score: z.unknown(), used_pct: z.number().int() })),
      bytes: z.number().int(),
    }),
    annotations: READ_ONLY,
  }, async ({ scores, csv, pillar, focus_area, rows, columns, session_name }) => {
    let parsed;
    try { parsed = parseScores({ scores, csv }, data); } catch (err) { return toolError(err.message); }
    const { list, errors } = filterItems(data, toParams({ pillar, focus_area }));
    if (errors.length) return toolError(errors.join('; '), { valid_pillars: slugs });
    const value = id => parsed.scores.get(id);
    const items = list.filter(it => {
      const s = value(it.id);
      if (rows === 'assessed') return s !== undefined;
      if (rows === 'gaps') return s !== 'na' && (typeof s !== 'number' || s <= 0.25);
      return true;
    });
    const text = csvText(projectColumns(buildCsvRows(items, parsed.scores, parsed.comments, data.faById), columns));
    const counts = { rows: items.length, assessed: 0, unassessed: 0, excluded: 0 };
    for (const it of items) { const s = value(it.id); counts[s === 'na' ? 'excluded' : typeof s === 'number' ? 'assessed' : 'unassessed'] += 1; }
    return {
      content: [{ type: 'text', text }],
      structuredContent: { csv: text, filename: csvFilename(session_name), columns: COLUMN_PRESETS[columns], counts, unknown_ids: parsed.unknown_ids, invalid_scores: parsed.invalid, off_scale: parsed.off_scale, bytes: text.length },
    };
  });
}

// ── resources ────────────────────────────────────────────────────────────────
function registerResources(server, data, origin) {
  const jsonContents = (uri, body) => ({ contents: [{ uri: uri.href, mimeType: JSON_MIME, text: JSON.stringify(stripLinks(body)) }] });
  const bpIds = data.items.map(it => it.id);
  const faIds = data.focusAreas.map(fa => fa.id);
  const slugs = data.pillars.map(p => p.slug);

  server.registerResource('lens', 'lens://lens', {
    title: 'Agentic AI Lens metadata',
    description: 'Abstract, design principles, pillars, roadmap reading paths, definitions and counts',
    mimeType: JSON_MIME,
    cacheHint: CACHE_HINT,
  }, async uri => jsonContents(uri, data.lens));

  server.registerResource('export-template', 'lens://export/template.csv', {
    title: 'Blank assessment CSV template',
    description: 'The 150 best practices with the 13 export columns and Status=Unassessed; fill Score (0%, 25%, 50%, 75%, 100% or N/A) and Comments, then import it into the web app',
    mimeType: 'text/csv',
    cacheHint: CACHE_HINT,
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/csv', text: csvText(buildCsvRows(data.items, new Map(), new Map(), data.faById)) }] }));

  server.registerResource('pillar', new ResourceTemplate('lens://pillars/{slug}', {
    list: async () => ({ resources: data.pillars.map(p => ({ uri: `lens://pillars/${p.slug}`, name: p.slug, title: p.name, description: `${p.counts.best_practices} best practices in ${p.counts.focus_areas} focus areas`, mimeType: JSON_MIME })) }),
    complete: { slug: value => startsWith(slugs, value) },
  }), {
    title: 'Pillar',
    description: 'One pillar with its design principles and focus areas',
    mimeType: JSON_MIME,
    cacheHint: CACHE_HINT,
  }, async (uri, { slug }) => {
    const p = findPillar(data, slug);
    if (!p) throw new ResourceNotFoundError(uri.href, `Unknown pillar '${slug}'`);
    return jsonContents(uri, shapePillar(data, p, origin, { detail: true }));
  });

  server.registerResource('focus-area', new ResourceTemplate('lens://focus-areas/{id}', {
    list: async () => ({ resources: data.focusAreas.map(fa => ({ uri: `lens://focus-areas/${fa.id}`, name: fa.id, title: fa.name, description: fa.question, mimeType: JSON_MIME })) }),
    complete: { id: value => startsWith(faIds, value) },
  }), {
    title: 'Focus area',
    description: 'One focus area: question, capability intent, maturity levels, common issues and best practices',
    mimeType: JSON_MIME,
    cacheHint: CACHE_HINT,
  }, async (uri, { id }) => {
    const fa = data.faById.get(normId(id));
    if (!fa) throw new ResourceNotFoundError(uri.href, `Unknown focus area '${id}'`);
    const out = shapeFocusArea(data, fa, origin, { expand: true });
    out.best_practices_detail = (fa.best_practices || []).map(bp => data.itemsById.get(bp)).filter(Boolean).map(it => project(shapeItem(data, it, origin), EMBED_FIELDS));
    return jsonContents(uri, out);
  });

  // The guidance template is registered before the generic one so a URI ending
  // in /guidance is matched by the more specific template first. Neither
  // best-practice template enumerates its 150 URIs in resources/list (that
  // made the listing 349 entries, about 84 KB, on every client connect); the
  // templates stay discoverable through resources/templates/list and id
  // completion, and search_best_practices finds the ids.
  server.registerResource('best-practice-guidance', new ResourceTemplate('lens://best-practices/{id}/guidance', {
    list: undefined,
    complete: { id: value => startsWith(bpIds, value) },
  }), {
    title: 'Best practice implementation guidance',
    description: 'Condensed implementation guidance (markdown) for one best practice',
    mimeType: MD_MIME,
    cacheHint: CACHE_HINT,
  }, async (uri, { id }) => {
    const item = data.itemsById.get(normId(id));
    if (!item) throw new ResourceNotFoundError(uri.href, `Unknown best practice '${id}'`);
    const markdown = await readGuidance(item);
    return { contents: [{ uri: uri.href, mimeType: MD_MIME, text: markdown }] };
  });

  server.registerResource('best-practice', new ResourceTemplate('lens://best-practices/{id}', {
    list: undefined,
    complete: { id: value => startsWith(bpIds, value) },
  }), {
    title: 'Best practice',
    description: 'One best practice with risk, AWS services, summary, desired outcome and links',
    mimeType: JSON_MIME,
    cacheHint: CACHE_HINT,
  }, async (uri, { id }) => {
    const item = data.itemsById.get(normId(id));
    if (!item) throw new ResourceNotFoundError(uri.href, `Unknown best practice '${id}'`);
    return jsonContents(uri, shapeItem(data, item, origin));
  });
}

// ── prompts ──────────────────────────────────────────────────────────────────
function registerPrompts(server, data, origin) {
  const faIds = data.focusAreas.map(fa => fa.id);
  const bpIds = data.items.map(it => it.id);
  const user = text => ({ messages: [{ role: 'user', content: { type: 'text', text } }] });
  const bullet = lines => lines.map(l => `- ${l}`).join('\n');

  server.registerPrompt('review_focus_area', {
    title: 'Review a focus area',
    description: 'Guided interview to assess one focus area: walks through its question, capability intent and maturity levels, then proposes a maturity level and per-best-practice scores, exported with export_assessment_csv in the format the web app imports.',
    argsSchema: z.object({
      focus_area_id: completable(z.string().describe('Focus area id, e.g. AGENTSEC03'), value => startsWith(faIds, value)),
    }),
  }, async ({ focus_area_id }) => {
    const fa = data.faById.get(normId(focus_area_id));
    if (!fa) throw new Error(`Unknown focus area '${focus_area_id}'`);
    const bps = (fa.best_practices || []).map(id => data.itemsById.get(id)).filter(Boolean);
    const levels = (fa.maturity_levels || []).map(l => `${l.level}. ${l.name}: ${l.description}`);
    return user([
      `You are helping me assess the focus area ${fa.id} "${fa.name}" (${fa.pillar} pillar) of the AWS Well-Architected Agentic AI Lens.`,
      '',
      `Question: ${fa.question}`,
      '',
      fa.intro ? `Context: ${fa.intro}\n` : '',
      'Capability intent:',
      bullet(fa.capability_intent || []),
      '',
      'Maturity levels:',
      bullet(levels),
      '',
      'Best practices in scope:',
      bullet(bps.map(it => `${it.id} (risk ${it.risk}): ${it.recommendation}`)),
      '',
      'Common issues to watch for:',
      bullet(fa.common_issues || []),
      '',
      'Interview me one question at a time to find out how my workload handles each best practice; ask for evidence, not intentions. When you have enough information: (1) state the maturity level 1-5 you observe and why, (2) score each best practice on the scale 0%, 25%, 50%, 75%, 100% or N/A (excluded), (3) list the gaps with the first concrete step for each, using get_implementation_guidance for the steps, and (4) call export_assessment_csv with the scores and comments (focus_area set to this id) and save the csv field of its result under the suggested file name so I can import it into the assessment app.',
      `Reference: ${fa.doc_url}`,
    ].join('\n'));
  });

  server.registerPrompt('gap_report', {
    title: 'Gap report from an export',
    description: 'Turn the CSV exported by the assessment app into a prioritized remediation report: coverage by pillar and focus area, the highest-risk gaps and next steps.',
    argsSchema: z.object({
      csv: z.string().describe('Raw CSV text exported from the assessment tool (columns ID, Score, Comments)'),
    }),
  }, async ({ csv }) => {
    let parsed;
    try { parsed = parseScores({ csv }, data); } catch (err) { throw new Error(err.message); }
    const report = scoreAssessment(data, parsed.scores, { comments: parsed.comments, maxGaps: 40 });
    const assessedRows = data.items.filter(it => parsed.scores.has(it.id));
    const pct = v => (v === null ? 'n/a' : `${v}%`);
    return user([
      'Write a prioritized remediation report for my agentic AI workload based on this self-assessment against the AWS Well-Architected Agentic AI Lens.',
      '',
      `Overall coverage: ${pct(report.overall_pct)} (${report.counts.assessed} assessed, ${report.counts.unassessed} unassessed, ${report.counts.excluded} excluded of ${report.counts.total}).`,
      '',
      'Coverage by pillar:',
      bullet(report.pillars.map(p => `${p.name}: ${pct(p.coverage_pct)} (${p.counts.assessed}/${p.counts.total} assessed)`)),
      '',
      `Gaps (score 25% or less, or unassessed): ${report.gaps_total} in total, High ${report.gaps_by_risk.High}, Medium ${report.gaps_by_risk.Medium}, Low ${report.gaps_by_risk.Low}. The highest-risk ones:`,
      bullet(report.gaps.map(g => `${g.id} [${g.risk}, ${g.status}${g.score_pct === null ? '' : ` ${g.score_pct}%`}] ${g.title}${g.comment ? ` — note: ${g.comment}` : ''}`)),
      parsed.unknown_ids.length ? `\nIds not in the Lens (ignored): ${parsed.unknown_ids.join(', ')}` : '',
      '',
      'Coverage by focus area:',
      bullet(report.focus_areas.map(f => `${f.id} ${f.name}: ${pct(f.coverage_pct)} (${f.counts.assessed}/${f.counts.total} assessed${f.counts.excluded ? `, ${f.counts.excluded} excluded` : ''})`)),
      '',
      'Structure the report as: executive summary; pillar-by-pillar findings; the top 10 remediation actions ordered by risk and effort, each with the best-practice id, the first implementation step (use get_implementation_guidance) and the AWS services involved; and a 30/60/90-day plan. Use get_focus_area to read the maturity levels when judging where a focus area stands. The assessed and excluded rows follow in the minimal CSV format (unassessed practices are omitted); pass them to score_assessment or export_assessment_csv if you need to recompute or update the assessment.',
      '',
      `Assessed rows (${assessedRows.length} of ${data.items.length}):`,
      '```csv',
      csvText(projectColumns(buildCsvRows(assessedRows, parsed.scores, parsed.comments, data.faById), 'minimal')).replace(/^\uFEFF/, '').trim(),
      '```',
    ].join('\n'));
  });

  server.registerPrompt('explain_best_practice', {
    title: 'Explain a best practice',
    description: 'Explain one best practice: why it matters, the desired outcome, implementation steps and the AWS services involved.',
    argsSchema: z.object({
      id: completable(z.string().describe('Best practice id, e.g. AGENTSEC03-BP02'), value => startsWith(bpIds, value)),
    }),
  }, async ({ id }) => {
    const item = data.itemsById.get(normId(id));
    if (!item) throw new Error(`Unknown best practice '${id}'`);
    const shaped = shapeItem(data, item, origin);
    let guidance = '';
    try { guidance = await readGuidance(item); } catch { guidance = '(guidance file unavailable)'; }
    return user([
      `Explain the AWS Well-Architected Agentic AI Lens best practice ${shaped.id} "${shaped.title}" (${shaped.pillar}, focus area ${shaped.focus_area_id} "${shaped.focus_area}", risk ${shaped.risk}).`,
      '',
      `Summary: ${shaped.summary}`,
      '',
      'Desired outcome:',
      bullet(shaped.desired_outcome),
      '',
      `AWS services mentioned: ${shaped.aws_services.join(', ') || 'none listed'}`,
      '',
      'Condensed implementation guidance:',
      guidance.trim(),
      '',
      `Cover: what risk it addresses for agentic systems, how to tell whether a workload meets it (evidence to look for), the implementation steps in order, and common anti-patterns. Finish with the official documentation link: ${shaped.doc_url}`,
    ].join('\n'));
  });
}

// ── factory ──────────────────────────────────────────────────────────────────
export async function buildServer({ origin } = {}) {
  const base = (origin || process.env.LENS_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
  const data = await loadData();
  const server = new McpServer({
    name: SERVER_NAME,
    title: 'AWS Well-Architected Agentic AI Lens',
    version: SERVER_VERSION,
    description: 'Unofficial study aid: the condensed Agentic AI Lens (pillars, focus areas, best practices, implementation guidance) plus self-assessment scoring',
    websiteUrl: base,
  }, { instructions: instructions(data) });
  registerTools(server, data, base);
  registerResources(server, data, base);
  registerPrompts(server, data, base);
  return server;
}
