// Canonical CSV export of an assessment, used by the MCP server. This is the
// Node copy of buildCsvRows() / csvText() in js/app.js (a classic browser
// script that cannot import modules); tools/csv_sync_test.mjs fails CI when the
// two drift apart. The column names ID, Score, Comments and Status are what the
// app's importer reads: keep them stable.

export const CSV_COLUMNS = ['ID', 'Pillar', 'Focus Area ID', 'Focus Area', 'Best Practice', 'Risk', 'Roadmap', 'AWS Services', 'Status', 'Alignment', 'Score', 'Comments', 'Doc URL'];

// Column presets offered by the MCP tool. Every preset keeps ID, Status, Score
// and Comments, so each of them imports into the web app.
export const COLUMN_PRESETS = {
  full: CSV_COLUMNS,
  review: ['ID', 'Focus Area ID', 'Best Practice', 'Risk', 'Status', 'Score', 'Comments'],
  minimal: ['ID', 'Status', 'Score', 'Comments'],
};

// Same labels as SCORING_OPTIONS in js/app.js, without the percentage prefix.
const ALIGNMENT_LABELS = new Map([[1, 'Full coverage'], [0.75, 'Advanced coverage'], [0.5, 'Medium coverage'], [0.25, 'Starting coverage'], [0, 'Not aligned']]);

const lookup = (map, key) => (map instanceof Map ? map.get(key) : map?.[key]);

// Status of a stored score value ('na', a number, or nothing).
export function scoreStatus(s) {
  if (s === 'na') return 'Excluded';
  return (s === null || s === undefined) ? 'Unassessed' : 'Assessed';
}

export function alignmentLabel(s) {
  if (s === 'na') return 'Excluded';
  return ALIGNMENT_LABELS.get(s) ?? '';
}

// Export rows (header first) for the given items, in the order given. scoreMap,
// commentMap and faById may be Maps or plain objects keyed by id.
export function buildCsvRows(items, scoreMap, commentMap, faById) {
  const rows = [CSV_COLUMNS];
  for (const item of items) {
    const s = lookup(scoreMap, item.id);
    const status = scoreStatus(s);
    const scoreVal = status === 'Excluded' ? 'N/A' : status === 'Assessed' ? Math.round(s * 100) + '%' : '';
    const fa = lookup(faById, item.focus_area_id);
    rows.push([
      item.id, item.pillar, item.focus_area_id, item.focus_area, item.recommendation, item.risk || '',
      (fa?.roadmap || []).join('; '), item.aws_service || '', status, alignmentLabel(s), scoreVal,
      lookup(commentMap, item.id) || '', item.doc_url || '',
    ]);
  }
  return rows;
}

// Keep only the named columns (a preset name or a list of column names).
export function projectColumns(rows, columns) {
  const names = Array.isArray(columns) ? columns : COLUMN_PRESETS[columns];
  if (!names) throw new Error(`Unknown column preset '${columns}' (use ${Object.keys(COLUMN_PRESETS).join(', ')})`);
  const idx = names.map(c => CSV_COLUMNS.indexOf(c));
  const bad = names.filter((c, i) => idx[i] < 0);
  if (bad.length) throw new Error(`Unknown column(s) ${bad.join(', ')}; valid: ${CSV_COLUMNS.join(', ')}`);
  return rows.map(r => idx.map(i => r[i]));
}

// RFC 4180 text (every field quoted) with a UTF-8 BOM so Excel reads accents
// and symbols correctly. Identical to csvText() in js/app.js.
export function csvText(rows) {
  return '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
}

// File name the app's importer understands: <session-slug>-<YYYY-MM-DD>.csv
// (it derives the session name and date from it: words split on '-', Title
// Case). Diacritics are folded ("Revisión" -> "revision") and any run of other
// characters becomes one hyphen. Identical to csvFilename() in js/app.js.
export function csvFilename(sessionName, date = new Date()) {
  const slug = String(sessionName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'assessment';
  return `${slug}-${date.toISOString().slice(0, 10)}.csv`;
}
