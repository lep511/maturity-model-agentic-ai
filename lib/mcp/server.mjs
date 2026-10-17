// MCP server over the Agentic AI Lens self-assessment content.
// Protocol revision 2026-07-28 through the official TypeScript SDK v2
// (@modelcontextprotocol/server); tools, resources and prompts only, no
// deprecated features (roots, sampling, MCP logging). buildServer() is cheap
// enough to run per request because lib/api/data.mjs caches the content per
// process, so the same factory serves stdio (mcp/stdio.mjs) and the stateless
// Streamable HTTP function (api/mcp.mjs). Response shapes come from
// lib/api/shapes.mjs and therefore match the REST API exactly.

import { McpServer, ResourceTemplate, ResourceNotFoundError, completable } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { loadData, readGuidance } from '../api/data.mjs';
import {
  lower, normId, paginate, project, findPillar, findRoadmap,
  shapeItem, shapeFocusArea, shapePillar, shapeRoadmap, filterItems, filterFocusAreas,
} from '../api/shapes.mjs';
import { extractMarkdownSection } from '../markdown.mjs';
import { parseScores, scoreAssessment } from './scoring.mjs';

export const SERVER_NAME = 'agentic-ai-lens';
export const SERVER_VERSION = '1.0.0';
export const DEFAULT_ORIGIN = 'https://agentic-ai-lens-assessment.vercel.app';

// Every tool is a pure read over immutable content.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// The content only changes with a deployment, so clients may cache resources.
const CACHE_HINT = { ttlMs: 24 * 60 * 60 * 1000, cacheScope: 'public' };
const JSON_MIME = 'application/json';
const MD_MIME = 'text/markdown';

// ── result helpers ───────────────────────────────────────────────────────────
const asJson = out => ({ content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out });
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
    'Start with list_pillars or search_best_practices, use get_focus_area for the question, capability intent and the five maturity levels, and get_implementation_guidance for the condensed implementation steps. score_assessment reads the CSV exported by the web app (columns ID, Score, Comments) and returns coverage per pillar and focus area plus the gap list.',
    `Every record carries doc_url; cite it and refer users to the official documentation (${data.lens.doc_url}) for authoritative wording.`,
  ].join('\n');
}

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
    description: 'The six Well-Architected pillars of the Agentic AI Lens with their intro, focus areas and best-practice counts by risk.',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
  }, async () => asJson({ count: data.pillars.length, items: data.pillars.map(p => shapePillar(data, p, origin)) }));

  server.registerTool('get_pillar', {
    title: 'Get a pillar',
    description: 'One pillar with its design principles, focus areas (id, name, question) and counts.',
    inputSchema: z.object({ pillar: pillarArg }),
    annotations: READ_ONLY,
  }, async ({ pillar }) => {
    const p = pillarOr404(pillar);
    return p ? asJson(shapePillar(data, p, origin, { detail: true })) : unknownPillar(pillar);
  });

  server.registerTool('list_focus_areas', {
    title: 'List focus areas',
    description: 'The 41 focus areas (question, pillar, roadmap paths, best-practice ids). Filter by pillar and/or roadmap; expand=true adds intro, capability intent, maturity levels and common issues.',
    inputSchema: z.object({
      pillar: pillarArg.optional(),
      roadmap: roadmapArg.optional(),
      expand: z.boolean().default(false).describe('Include intro, capability_intent, maturity_levels and common_issues'),
    }),
    annotations: READ_ONLY,
  }, async ({ pillar, roadmap, expand }) => {
    const { list, errors } = filterFocusAreas(data, toParams({ pillar, roadmap }));
    if (errors.length) return toolError(errors.join('; '), { valid_pillars: slugs, valid_roadmaps: roadmapIds });
    return asJson({ count: list.length, items: list.map(fa => shapeFocusArea(data, fa, origin, { expand })) });
  });

  server.registerTool('get_focus_area', {
    title: 'Get a focus area',
    description: 'One focus area in full: question, intro, capability intent, the five maturity levels (Initial to Optimized), common issues and its best practices with risk and summary.',
    inputSchema: z.object({ id: faIdArg }),
    annotations: READ_ONLY,
  }, async ({ id }) => {
    const fa = data.faById.get(normId(id));
    if (!fa) return unknownFocusArea(id);
    const out = shapeFocusArea(data, fa, origin, { expand: true });
    out.best_practices_detail = (fa.best_practices || []).map(bp => data.itemsById.get(bp)).filter(Boolean).map(it => shapeItem(data, it, origin));
    return asJson(out);
  });

  server.registerTool('search_best_practices', {
    title: 'Search best practices',
    description: 'Search and filter the 150 best practices. q matches id, title, summary, desired outcome, focus area, AWS services and pillar. Results are paginated (limit/offset) and can be projected to a few fields.',
    inputSchema: z.object({
      q: z.string().optional().describe('Free-text, case-insensitive substring search'),
      pillar: pillarArg.optional(),
      focus_area: faIdArg.optional(),
      risk: z.string().optional().describe('High, Medium or Low; comma-separated to combine'),
      roadmap: roadmapArg.optional(),
      limit: z.number().int().min(1).max(500).default(25).describe('Page size (max 500)'),
      offset: z.number().int().min(0).default(0),
      fields: z.string().optional().describe('Comma-separated field names to keep, e.g. id,title,risk,focus_area_id'),
    }),
    annotations: READ_ONLY,
  }, async ({ q, pillar, focus_area, risk, roadmap, limit, offset, fields }) => {
    const { list, errors } = filterItems(data, toParams({ q, pillar, focus_area, risk, roadmap }));
    if (errors.length) return toolError(errors.join('; '), { valid_pillars: slugs, valid_roadmaps: roadmapIds, valid_risk: ['High', 'Medium', 'Low'] });
    const page = paginate(list, toParams({ limit, offset }));
    return asJson({
      total: page.total, count: page.items.length, offset: page.offset, limit: page.limit,
      items: page.items.map(it => project(shapeItem(data, it, origin), fields)),
    });
  });

  server.registerTool('get_best_practice', {
    title: 'Get a best practice',
    description: 'One best practice: title, pillar, focus area and its question, risk, AWS services, summary, desired outcome, roadmap paths and documentation link. include_guidance=true embeds the condensed implementation guidance (markdown).',
    inputSchema: z.object({
      id: bpIdArg,
      include_guidance: z.boolean().default(false).describe('Embed the guidance markdown as guidance_markdown'),
    }),
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
    description: 'The Lens roadmap: reading paths (building your first agent, moving to production, scaling to multi-agent systems, hardening an existing deployment) with their focus areas. Pass roadmap to get one path with its best practices in full.',
    inputSchema: z.object({ roadmap: roadmapArg.optional() }),
    annotations: READ_ONLY,
  }, async ({ roadmap }) => {
    const paths = data.lens.roadmap || [];
    if (!roadmap) return asJson({ count: paths.length, items: paths.map(r => shapeRoadmap(data, r, origin)) });
    const r = findRoadmap(data, roadmap);
    return r ? asJson(shapeRoadmap(data, r, origin, { detail: true })) : toolError(`Unknown roadmap path '${roadmap}'`, { valid: roadmapIds });
  });

  server.registerTool('lookup_definition', {
    title: 'Look up a definition',
    description: 'Glossary of Lens terms (agent, tool, guardrail, agent memory, orchestration, ...). Case-insensitive substring match on term and definition; empty query lists every term.',
    inputSchema: z.object({ q: z.string().default('').describe('Term or fragment, e.g. memory') }),
    annotations: READ_ONLY,
  }, async ({ q }) => {
    const needle = lower(q).trim();
    const defs = (data.lens.definitions || []).filter(d => !needle || lower(d.term).includes(needle) || lower(d.definition).includes(needle));
    return asJson({ count: defs.length, items: defs });
  });

  server.registerTool('score_assessment', {
    title: 'Score an assessment',
    description: "Compute coverage for a self-assessment. Pass the CSV exported by the web app (columns ID, Score, Comments; Score like 75% or N/A) and/or a scores list ({id, score, comment?} with score 0..1, a percentage, or 'na' for excluded). Same rule as the app: unassessed best practices count as 0 %, excluded ones leave the denominator. Returns overall, per-pillar and per-focus-area coverage, status counts and the gap list (score 25 % or less, or unassessed) ordered by risk.",
    inputSchema: z.object({
      csv: z.string().optional().describe('Raw CSV text exported from the assessment tool'),
      scores: z.array(z.object({
        id: bpIdArg,
        score: z.union([z.number(), z.string()]).describe("0, 0.25, 0.5, 0.75, 1 (or 0-100, '75%', 'na')"),
        comment: z.string().optional(),
      })).optional(),
      max_gaps: z.number().int().min(0).max(150).default(30).describe('Maximum number of gap entries to return'),
    }),
    annotations: READ_ONLY,
  }, async ({ csv, scores, max_gaps }) => {
    if (!csv && !(Array.isArray(scores) && scores.length)) return toolError('Provide csv (the exported CSV text) and/or a non-empty scores list');
    let parsed;
    try { parsed = parseScores({ csv, scores }, data); } catch (err) { return toolError(err.message); }
    const report = scoreAssessment(data, parsed.scores, { comments: parsed.comments, maxGaps: max_gaps });
    return asJson({ ...report, unknown_ids: parsed.unknown_ids, invalid_scores: parsed.invalid, scoring_rule: 'coverage = mean of applicable scores; unassessed = 0 %, excluded (N/A) removed from the denominator' });
  });
}

// ── resources ────────────────────────────────────────────────────────────────
function registerResources(server, data, origin) {
  const jsonContents = (uri, body) => ({ contents: [{ uri: uri.href, mimeType: JSON_MIME, text: JSON.stringify(body) }] });
  const bpIds = data.items.map(it => it.id);
  const faIds = data.focusAreas.map(fa => fa.id);
  const slugs = data.pillars.map(p => p.slug);

  server.registerResource('lens', 'lens://lens', {
    title: 'Agentic AI Lens metadata',
    description: 'Abstract, design principles, pillars, roadmap reading paths, definitions and counts',
    mimeType: JSON_MIME,
    cacheHint: CACHE_HINT,
  }, async uri => jsonContents(uri, { ...data.lens, links: { api: `${origin}/api/lens`, docs: data.lens.doc_url } }));

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
    out.best_practices_detail = (fa.best_practices || []).map(bp => data.itemsById.get(bp)).filter(Boolean).map(it => shapeItem(data, it, origin));
    return jsonContents(uri, out);
  });

  // The guidance template is registered before the generic one so a URI ending
  // in /guidance is matched by the more specific template first.
  server.registerResource('best-practice-guidance', new ResourceTemplate('lens://best-practices/{id}/guidance', {
    list: async () => ({ resources: data.items.map(it => ({ uri: `lens://best-practices/${it.id}/guidance`, name: `${it.id} guidance`, title: `${it.id}: implementation guidance`, mimeType: MD_MIME })) }),
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
    list: async () => ({ resources: data.items.map(it => ({ uri: `lens://best-practices/${it.id}`, name: it.id, title: it.recommendation, description: `${it.pillar} · ${it.focus_area_id} · risk ${it.risk}`, mimeType: JSON_MIME })) }),
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
    description: 'Guided interview to assess one focus area: walks through its question, capability intent and maturity levels, then proposes a maturity level and per-best-practice scores in the CSV format the web app imports.',
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
      'Interview me one question at a time to find out how my workload handles each best practice; ask for evidence, not intentions. When you have enough information: (1) state the maturity level 1-5 you observe and why, (2) score each best practice on the scale 0%, 25%, 50%, 75%, 100% or N/A (excluded), (3) list the gaps with the first concrete step for each, using get_implementation_guidance for the steps, and (4) output a CSV block with the columns ID,Score,Comments (Score as a percentage like 75% or N/A) that I can import into the assessment app.',
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
      'Structure the report as: executive summary; pillar-by-pillar findings; the top 10 remediation actions ordered by risk and effort, each with the best-practice id, the first implementation step (use get_implementation_guidance) and the AWS services involved; and a 30/60/90-day plan. Call score_assessment with the same CSV if you need the per-focus-area numbers, and get_focus_area to read the maturity levels when judging where a focus area stands.',
      '',
      'CSV as exported:',
      '```csv',
      csv.trim(),
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
