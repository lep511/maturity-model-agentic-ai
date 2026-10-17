// Assessment scoring for the MCP server. Mirrors the rules of the web app
// (js/app.js): unassessed best practices count as 0 %, items excluded from the
// analysis ('na') leave the denominator, and a CSV export is read through its
// ID / Score / Comments columns only, so exports from any version import.

import { normId } from '../api/shapes.mjs';

const RISK_ORDER = { High: 0, Medium: 1, Low: 2 };

// Same algorithm as parseCSVLine() in js/app.js (RFC 4180 quoting).
export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsv(text) {
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  return { headers: parseCsvLine(lines[0]).map(h => h.trim()), rows: lines.slice(1).map(parseCsvLine) };
}

const clamp01 = n => Math.min(1, Math.max(0, n));

// Score of one structured entry: a fraction (0, 0.25 ... 1), a percentage
// (number above 1, or any string ending in %), or 'na' / 'N/A' for excluded.
// Returns undefined for blank values and null for values it cannot read.
export function normalizeScore(raw) {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? clamp01(raw > 1 ? raw / 100 : raw) : null;
  const s = String(raw).trim();
  if (s === '') return undefined;
  if (/^(n\/a|na|excluded)$/i.test(s)) return 'na';
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return clamp01(s.endsWith('%') || n > 1 ? n / 100 : n);
}

// Builds the score map from a CSV export and/or a structured list. CSV scores
// follow the app exactly (percent strings, 'N/A' for excluded). Ids are
// normalised the same way the API does (case, '_' -> '-').
export function parseScores({ csv, scores } = {}, data) {
  const map = new Map();
  const comments = new Map();
  const invalid = [];

  if (csv) {
    const { headers, rows } = parseCsv(csv);
    const idxId = headers.indexOf('ID');
    const idxScore = headers.indexOf('Score');
    const idxComments = headers.indexOf('Comments');
    if (idxId === -1 || idxScore === -1) throw new Error("The CSV needs 'ID' and 'Score' columns (export it from the assessment tool)");
    for (const cols of rows) {
      const id = normId(cols[idxId]);
      if (!id) continue;
      const raw = (cols[idxScore] ?? '').trim();
      if (raw === 'N/A') map.set(id, 'na');
      else if (raw !== '') {
        const n = parseFloat(raw) / 100;
        if (Number.isFinite(n)) map.set(id, clamp01(n)); else invalid.push({ id, score: raw });
      }
      const comment = idxComments === -1 ? '' : (cols[idxComments] ?? '').trim();
      if (comment) comments.set(id, comment);
    }
  }

  if (Array.isArray(scores)) {
    for (const row of scores) {
      const id = normId(row?.id);
      if (!id) continue;
      const v = normalizeScore(row.score);
      if (v === null) invalid.push({ id, score: row.score });
      else if (v !== undefined) map.set(id, v);
      if (row.comment) comments.set(id, String(row.comment).trim());
    }
  }

  const unknown_ids = data ? [...map.keys()].filter(id => !data.itemsById.has(id)) : [];
  return { scores: map, comments, unknown_ids, invalid };
}

// Coverage percentage over the applicable items, same rule as coveragePct()
// in js/app.js. Returns null when every item is excluded.
export function coveragePct(items, scoreMap) {
  const applicable = items.filter(it => scoreMap.get(it.id) !== 'na');
  if (!applicable.length) return null;
  const sum = applicable.reduce((acc, it) => {
    const s = scoreMap.get(it.id);
    return acc + (typeof s === 'number' ? s : 0);
  }, 0);
  return (sum / applicable.length) * 100;
}

const statusOf = (scoreMap, it) => {
  const s = scoreMap.get(it.id);
  return s === 'na' ? 'excluded' : typeof s === 'number' ? 'assessed' : 'unassessed';
};

function tally(items, scoreMap) {
  const counts = { total: items.length, assessed: 0, unassessed: 0, excluded: 0 };
  for (const it of items) counts[statusOf(scoreMap, it)] += 1;
  return counts;
}

const round1 = v => (v === null ? null : Math.round(v * 10) / 10);

// Full scoring report: overall, per pillar, per focus area and the gap list
// (best practices scored 25 % or less, or not assessed; excluded items never
// count as gaps). Gaps are ordered by risk (High first) then id.
export function scoreAssessment(data, scoreMap, { comments = new Map(), maxGaps = 30 } = {}) {
  const items = data.items;
  const pillars = data.pillars.map(p => {
    const list = items.filter(it => it.pillar === p.name);
    return { name: p.name, slug: p.slug, coverage_pct: round1(coveragePct(list, scoreMap)), counts: tally(list, scoreMap) };
  });
  const focus_areas = data.focusAreas.map(fa => {
    const list = items.filter(it => it.focus_area_id === fa.id);
    return { id: fa.id, name: fa.name, pillar: fa.pillar, coverage_pct: round1(coveragePct(list, scoreMap)), counts: tally(list, scoreMap) };
  });
  const allGaps = items
    .filter(it => { const s = scoreMap.get(it.id); return s !== 'na' && (typeof s !== 'number' || s <= 0.25); })
    .map(it => {
      const s = scoreMap.get(it.id);
      return {
        id: it.id, title: it.recommendation, pillar: it.pillar, focus_area_id: it.focus_area_id, risk: it.risk,
        status: statusOf(scoreMap, it), score_pct: typeof s === 'number' ? Math.round(s * 100) : null,
        comment: comments.get(it.id) ?? null, doc_url: it.doc_url,
      };
    })
    .sort((a, b) => (RISK_ORDER[a.risk] ?? 9) - (RISK_ORDER[b.risk] ?? 9) || a.id.localeCompare(b.id));
  const gapRisk = { High: 0, Medium: 0, Low: 0 };
  for (const g of allGaps) if (g.risk in gapRisk) gapRisk[g.risk] += 1;

  return {
    overall_pct: round1(coveragePct(items, scoreMap)),
    counts: tally(items, scoreMap),
    pillars,
    focus_areas,
    gaps_total: allGaps.length,
    gaps_by_risk: gapRisk,
    gaps: allGaps.slice(0, Math.max(0, maxGaps)),
  };
}
