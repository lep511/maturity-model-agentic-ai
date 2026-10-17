// Read-only data access for the Lens API.
// Loads the generated content (data/, guidance/) once per function instance and
// builds the indexes the router needs. The content is immutable per deployment,
// so caching it in module scope is safe (Fluid Compute reuses instances).

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unescapeHtml } from './shapes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATE_ROOTS = [path.resolve(HERE, '..', '..'), process.cwd()];

let rootPromise = null;
let dataPromise = null;
const guidanceCache = new Map();

async function resolveRoot() {
  if (!rootPromise) {
    rootPromise = (async () => {
      for (const root of CANDIDATE_ROOTS) {
        try { await access(path.join(root, 'data', 'manifest.json')); return root; } catch { /* try next */ }
      }
      throw new Error('data/manifest.json not found; is the data directory included in the function bundle?');
    })();
  }
  return rootPromise;
}

async function readJson(root, rel) {
  return JSON.parse(await readFile(path.join(root, rel), 'utf8'));
}

// Lower-cased texts searched by filterItems() for the q parameter: the title
// (id + recommendation), the item's own fields, and everything including the
// condensed guidance markdown (link targets and bare URLs removed so they do
// not match). Built once per instance; see searchRank() in shapes.mjs.
function searchTexts(item, fa, guidance) {
  const lower = s => unescapeHtml(s).toLowerCase();
  const title = lower(`${item.id} ${item.recommendation}`);
  const fields = `${title}\n${lower([item.guidance, item.how_to_check, item.focus_area, item.aws_service, item.pillar, fa?.question].join('\n'))}`;
  const body = lower(String(guidance || '').replace(/\]\([^)]*\)/g, ']').replace(/https?:\/\/\S+/g, ''));
  return { title, fields, all: `${fields}\n${body}` };
}

function countRisk(items) {
  const risk = { High: 0, Medium: 0, Low: 0 };
  for (const it of items) if (it.risk in risk) risk[it.risk] += 1;
  return risk;
}

export async function loadData() {
  if (!dataPromise) {
    dataPromise = (async () => {
      const root = await resolveRoot();
      const manifest = await readJson(root, 'data/manifest.json');
      const [lens, focusAreas, ...items] = await Promise.all([
        readJson(root, manifest.lens || 'data/lens/lens.json'),
        readJson(root, manifest.focus_areas || 'data/lens/focus_areas.json'),
        ...manifest.items.map(async rel => {
          const item = await readJson(root, rel);
          item._guidancePath = rel.replace(/^data\//, 'guidance/').replace(/\.json$/, '.md');
          return item;
        }),
      ]);

      const itemsById = new Map(items.map(it => [it.id, it]));
      const faById = new Map(focusAreas.map(fa => [fa.id, fa]));
      // Guidance files are small (about 8 KB each); reading all 150 here costs a
      // few milliseconds at cold start and makes q search cover them.
      await Promise.all(items.map(async it => {
        const guidance = await readGuidance(it).catch(() => '');
        it._search = searchTexts(it, faById.get(it.focus_area_id), guidance);
      }));
      const pillars = (lens.pillars || []).map(p => {
        const pillarItems = items.filter(it => it.pillar === p.name);
        return {
          ...p,
          counts: { focus_areas: (p.focus_areas || []).length, best_practices: pillarItems.length, risk: countRisk(pillarItems) },
        };
      });
      const pillarByName = new Map(pillars.map(p => [p.name, p]));
      const faCounts = new Map(focusAreas.map(fa => {
        const faItems = items.filter(it => it.focus_area_id === fa.id);
        return [fa.id, { best_practices: faItems.length, risk: countRisk(faItems) }];
      }));

      return {
        root, manifest, lens, pillars, pillarByName, focusAreas, faById, faCounts, items, itemsById,
        counts: { pillars: pillars.length, focus_areas: focusAreas.length, best_practices: items.length, risk: countRisk(items) },
      };
    })().catch(err => { dataPromise = null; throw err; });
  }
  return dataPromise;
}

export async function readGuidance(item) {
  if (!guidanceCache.has(item.id)) {
    const root = await resolveRoot();
    guidanceCache.set(item.id, readFile(path.join(root, item._guidancePath), 'utf8').catch(err => {
      guidanceCache.delete(item.id);
      throw err;
    }));
  }
  return guidanceCache.get(item.id);
}
