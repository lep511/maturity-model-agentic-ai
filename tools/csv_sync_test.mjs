#!/usr/bin/env node
// Guards the functions that exist twice because js/app.js is a classic browser
// script and cannot import modules: the CSV export (buildCsvRows / csvText) and
// the CSV parser (parseCSVRows) versus lib/csv.mjs and lib/mcp/scoring.mjs, and
// extractMarkdownSection versus lib/markdown.mjs. The browser copies are pulled
// out of app.js by name and run in Node on the repository content; any
// difference in output fails the test.
//   node tools/csv_sync_test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildCsvRows, csvText, CSV_COLUMNS } from '../lib/csv.mjs';
import { parseCsvRows } from '../lib/mcp/scoring.mjs';
import { extractMarkdownSection } from '../lib/markdown.mjs';
import { loadData } from '../lib/api/data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
let passes = 0, failures = 0;
const assert = (cond, msg) => { if (cond) passes++; else { failures++; console.error('ASSERT FAIL:', msg); } };

// Source of a top-level `function name(` declaration, by brace matching.
function functionSource(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`js/app.js has no function ${name}()`);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces in ${name}()`);
}
// Source of a top-level `const NAME = [...]` array literal.
function constSource(name) {
  const start = src.indexOf(`const ${name} = [`);
  if (start < 0) throw new Error(`js/app.js has no const ${name}`);
  return src.slice(start, src.indexOf('];', start) + 2);
}

const data = await loadData();
const FA_BY_ID = Object.fromEntries(data.focusAreas.map(fa => [fa.id, fa]));
const browser = new Function('FA_BY_ID', [
  constSource('SCORING_OPTIONS'), constSource('CSV_COLUMNS'),
  ...['scoreStatus', 'alignmentLabel', 'buildCsvRows', 'csvText', 'parseCSVRows', 'extractMarkdownSection'].map(functionSource),
  'return { CSV_COLUMNS, buildCsvRows, csvText, parseCSVRows, extractMarkdownSection };',
].join('\n'))(FA_BY_ID);

// 1. CSV export: same bytes for the same session.
const scores = { 'AGENTOPS01-BP01': 1, 'AGENTOPS01-BP02': 'na', 'AGENTOPS01-BP03': 0.5, 'AGENTSEC01-BP01': 0.25, 'AGENTSUS03-BP04': 0 };
const comments = { 'AGENTOPS01-BP03': 'needs\nwork, with "quotes" and ñ', 'AGENTSUS03-BP04': ' trailing ' };
const fromBrowser = browser.csvText(browser.buildCsvRows(data.items, scores, comments));
const fromNode = csvText(buildCsvRows(data.items, new Map(Object.entries(scores)), new Map(Object.entries(comments)), data.faById));
assert(browser.CSV_COLUMNS.join() === CSV_COLUMNS.join(), 'CSV_COLUMNS match');
assert(fromBrowser === fromNode, 'buildCsvRows + csvText produce identical CSV in the browser copy and lib/csv.mjs');
assert(parseCsvRows(fromBrowser).length === 151 && fromBrowser.startsWith('\uFEFF"ID"') && fromBrowser.endsWith('\n'), 'export has header + 150 rows, a BOM and a trailing newline');

// 2. CSV parser: same rows for tricky input.
const tricky = '\uFEFFID,Score,Comments\r\n"A-1","100%","multi\nline, ""quoted"""\r\nB-2,,\n\nC-3,N/A,"x"\n';
const rowsBrowser = browser.parseCSVRows(tricky);
const rowsNode = parseCsvRows(tricky);
assert(JSON.stringify(rowsBrowser) === JSON.stringify(rowsNode), 'parseCSVRows and parseCsvRows agree');
assert(rowsNode.length === 5 && rowsNode[1][2] === 'multi\nline, "quoted"' && rowsNode[3].length === 1, 'parser handles BOM, CRLF, embedded newline and blank line');
assert(JSON.stringify(browser.parseCSVRows(fromBrowser)) === JSON.stringify(parseCsvRows(fromNode)), 'both parsers read the export identically');

// 3. Markdown section extraction.
const md = '# T\n\nintro\n\n## Desired outcome\n\n- a\n\n### Implementation steps\n\n1. one\n2. two\n\n#### Sub\n\nx\n\n### Resources\n\n- r\n';
for (const title of ['Implementation steps', 'Desired outcome', 'Resources', 'Missing']) {
  assert(browser.extractMarkdownSection(md, title) === extractMarkdownSection(md, title), `extractMarkdownSection('${title}') agrees`);
}
assert(extractMarkdownSection(md, 'Implementation steps').includes('#### Sub') && !extractMarkdownSection(md, 'Implementation steps').includes('Resources'), 'section keeps deeper headings and stops at the next sibling');

console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
