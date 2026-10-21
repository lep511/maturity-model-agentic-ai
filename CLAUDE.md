# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

AWS Well-Architected Agentic AI Lens Self-Assessment — a static web app for self-assessing an agentic AI workload against the 150 best practices of the AWS Well-Architected Agentic AI Lens (6 pillars, 41 focus areas). Content is condensed from the official AWS documentation with attribution; the app is an unofficial study aid. Deployed to Vercel.

Official source: https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html (initial release June 10, 2026). Every docs page is also served as markdown at the same URL with a `.md` suffix; the generator relies on this.

## Running Locally

Must use a local server (file:// will fail due to CORS on JSON fetches):
```bash
npx serve .
# or
python3 -m http.server 3000
```

The static app and the REST API have no dependencies. `npm ci` is only needed for the MCP server and its smoke test.

## Deployment

```bash
vercel          # preview
vercel --prod   # production
node tools/mcp_probe.mjs   # then probe the deployed MCP endpoint (real HTTP; `npm run probe:mcp`)
```

Production URL: https://agentic-ai-lens-assessment.vercel.app

## Content Pipeline (do not hand-edit `data/` or `guidance/`)

```bash
python3 -I tools/build_lens_content.py   # fetch (cached in .cache/lens-docs/), parse, write data/ + guidance/
python3 -I tools/validate_content.py     # offline consistency checks, also run by CI
```

`python3 -I tools/check_lens_updates.py` (optionally `--deep --refresh`, `--json`) compares the published Lens with the repository and exits 1 when new or changed entries exist; `.github/workflows/check-lens-updates.yml` runs it on every push and opens a `lens-update` issue when it exits 1. `build_lens_content.py --out DIR` writes to another root (used by the deep check).

`build_lens_content.py` is standard-library only (Python 3.9+). It enumerates pillars, questions and best practices from `appendix-a.md`, parses each focus-area and best-practice page, and emits deterministic output (re-running produces no diff). Numbered implementation steps fold their `+` sub-bullets inline (`fold_sub_bullets()`), so no step ends in a dangling colon. Flags: `--refresh`, `--full`, `--clean`, `--sleep`, `--allow-count-drift`. It asserts the known release counts (6 / 41 / 150, risk 90 High / 59 Medium / 1 Low); update `EXPECTED` in the script and `tools/validate_content.py` when AWS revises the Lens.

## Read-only API (Vercel Function)

- `api/index.mjs` exports `{ fetch }` (Web-standard handler) and delegates to `lib/api/router.mjs`. `vercel.json` rewrites `/api/:path*` to `/api/index` and bundles `data/` and `guidance/` with `functions["api/index.mjs"].includeFiles`. The only other function is `api/mcp.mjs` (see the MCP section).
- `lib/api/data.mjs` loads the generated content once per instance (module-scope cache), builds indexes and reads every guidance file to attach `item._search` (lower-cased title / fields / everything texts for the `q` search); `lib/api/shapes.mjs` holds the lookups (`findPillar`, `findRoadmap`), filters (`filterItems`, `filterFocusAreas`, `paginate`, `project`), the ranked search (`rankBySearch`: every word of `q` must match as a substring in any order; title matches rank first, then the record, then guidance-only matches, whole-phrase bonus, ties in Lens order) and response shapes (`shapeItem`, `shapeFocusArea`, `shapePillar`, `shapeRoadmap`) shared with the MCP server; `lib/api/openapi.mjs` builds the OpenAPI 3.1 document served at `/api/openapi.json`.
- Endpoints: `/api`, `/api/lens`, `/api/pillars[/{slug}]`, `/api/focus-areas[/{id}]`, `/api/best-practices[/{id}[/guidance]]`, `/api/roadmap[/{id}]`, `/api/definitions`. GET/HEAD/OPTIONS only; JSON errors `{error:{code,message}}`; CORS `*`; `Cache-Control: public, max-age=300, s-maxage=86400`. The index also advertises the MCP endpoint (`mcp.url`).
- Shared code lives outside `api/` on purpose (Vercel creates one function per file in `api/`). Test with `node tools/api_smoke_test.mjs` (no network or dependencies needed; also run in CI).

## MCP server (Vercel Function + stdio)

- Protocol revision **2026-07-28** (the current one) through the official TypeScript SDK v2: `@modelcontextprotocol/server` (runtime) and `@modelcontextprotocol/client` (smoke test only), `zod` 4 for schemas. Do not add the v1 `@modelcontextprotocol/sdk`. No deprecated features (roots, sampling, MCP logging; the deprecated HTTP+SSE transport is not served). Logs go to `stderr`.
- `lib/mcp/server.mjs` exports `buildServer({ origin })`, an async factory that registers 11 read-only tools (`list_pillars`, `get_pillar`, `list_focus_areas`, `get_focus_area`, `search_best_practices`, `get_best_practice`, `get_implementation_guidance`, `get_roadmap`, `lookup_definition`, `score_assessment`, `export_assessment_csv`), 2 static resources (`lens://lens`, `lens://export/template.csv`) plus 4 `ResourceTemplate`s under the `lens://` scheme (completions and `cacheHint` on all four; only the pillar and focus-area templates `list`, so `resources/list` stays at 49 entries instead of 349), and 3 prompts (`review_focus_area`, `gap_report`, `explain_best_practice`). Tool inputs are `z.object()` schemas; the ten JSON tools declare loose `outputSchema`s (`OUT` in `server.mjs`, extra fields allowed) and results carry both `content` (JSON text or markdown) and `structuredContent`; `get_implementation_guidance` is text-only on purpose; errors return `isError: true`. Shapes come from `lib/api/shapes.mjs` and are trimmed for a model's context in `server.mjs`: `stripLinks()` removes every `links` object (doc_url stays), listings keep `LIST_FIELDS` (id, title, risk, focus_area_id, pillar_slug) unless `detail: true` or `fields` is passed, practices embedded in focus-area and roadmap detail keep `EMBED_FIELDS` (id, title, risk, summary, doc_url), `list_pillars` omits intro and questions, `list_focus_areas` rejects `expand: true` without a pillar or roadmap filter (41 expanded areas are about 520 KB), and `search_best_practices` defaults to `limit` 50 (largest pillar: 33) and caps `detail: true` pages at `DETAIL_LIMIT_MAX` (25). Tool descriptions and `instructions` quote approximate sizes; keep them accurate when shapes change.
- `lib/mcp/scoring.mjs` scores an assessment from the CSV the web app exports (columns `ID`, `Score`, `Comments` and the optional `Status`) or a `{id, score}` list, with the same rule as `coveragePct()` in `js/app.js`: unassessed = 0 %, excluded (`N/A`) removed from the denominator. Gaps = score 25 % or less or unassessed, ordered by risk. Numeric scores are snapped to the app's 0 / 25 / 50 / 75 / 100 % scale (`snapScore()`) and every adjustment is reported in `off_scale`; `N/A`, `na` and `Excluded` are read case-insensitively in both inputs; the scores list wins over the CSV for the same id.
- `export_assessment_csv` returns the CSV text (never writes files): `parseScores()` for the input, `filterItems()` for pillar / focus-area filters, `rows` (all / assessed / gaps) and `columns` presets (`COLUMN_PRESETS` in `lib/csv.mjs`: full 13 columns, review, minimal; all importable), `csvFilename()` for the suggested `<session>-<date>.csv`. `content` is the CSV itself and `structuredContent`, declared with an `outputSchema`, repeats it as `csv` next to filename, columns, counts and `off_scale`, because some clients (Claude Code among them) only surface `structuredContent`. The `review_focus_area` prompt tells the model to finish with this tool; `gap_report` embeds the computed summary, the coverage per focus area and only the assessed rows as a minimal CSV (not the raw export).
- `lib/csv.mjs` is the Node copy of the app's `buildCsvRows()` / `csvText()` / `csvFilename()`; `lib/markdown.mjs` holds `extractMarkdownSection()`, a copy of the function in `js/app.js` (classic script, cannot import). `tools/csv_sync_test.mjs` extracts the browser copies from `js/app.js` and fails CI when any of the four duplicated helpers (CSV export, CSV parser, file name, markdown section) diverges, so edit both sides together.
- Entry points: `mcp/stdio.mjs` (`serveStdio`, run with `npm run mcp` or `node mcp/stdio.mjs`) and `api/mcp.mjs` (`createMcpHandler`, stateless: a fresh `McpServer` per request, content cached per instance). `vercel.json` rewrites `/mcp` to `/api/mcp` **before** the `/api/:path*` rule and bundles `data/` and `guidance/` for it too (`/mcp` is the canonical URL; Vercel also resolves `/api/mcp` to the function itself rather than to the API router). Preview deployments are protected by Vercel Authentication: test them with `vercel curl <url> ...` instead of plain `curl`. The function adds CORS headers (`Mcp-Method`, `Mcp-Name`, `MCP-Protocol-Version` allowed). Legacy `initialize`-based clients (2025-11-25 and earlier) are served statelessly by the SDK.
- Streamable HTTP in 2026-07-28 is POST-only (no GET stream, no sessions) and every request must carry `MCP-Protocol-Version`, `Mcp-Method` and, for `tools/call` / `resources/read` / `prompts/get`, `Mcp-Name` mirroring the body; `server/discover` returns supported versions, capabilities and the server `instructions`.
- Dependencies: `package.json` + `package-lock.json` (no `build` script, Vercel must not build). Install with `npm ci`. Test with `node tools/mcp_smoke_test.mjs` (in-process client, the real stdio child process, and raw JSON-RPC against the HTTP function; no network).

## CI / Checks

GitHub Actions workflow (`.github/workflows/check-links.yml`) runs on push/PR to `data/**`, `guidance/**`, `tools/**`, `api/**`, `lib/**`, `mcp/**`, `vercel.json`, `package.json`, `package-lock.json`:
1. `tools/validate_content.py` — schema, counts, manifest and guidance-file consistency
2. `npm ci` (Node 24), then `tools/api_smoke_test.mjs` — read-only API routed in-process
3. `tools/mcp_smoke_test.mjs` — MCP server over InMemoryTransport, stdio and the HTTP function
4. `tools/csv_sync_test.mjs` — browser copies of the CSV / file-name / markdown helpers in `js/app.js` must match `lib/csv.mjs`, `lib/mcp/scoring.mjs`, `lib/markdown.mjs`
5. `data/count_chars.sh data` — fails if any item JSON exceeds 2500 characters (`data/lens/*` is skipped)
6. `data/extract_link.sh .` — extracts unique Lens documentation links from JSON and markdown
7. `data/check_link_action.sh` — verifies extracted links respond with 2xx/3xx

`.github/workflows/check-mcp-production.yml` runs `tools/mcp_probe.mjs` against the deployed MCP endpoint daily and on demand (real HTTP: discover, listings, tool calls, legacy handshake, `/api` advertisement); deployments are made with the Vercel CLI, so run the probe yourself after `vercel --prod`.

## Architecture

Single-page app with no build step — vanilla HTML/CSS/JS served as static files.

- `api/index.mjs` + `lib/api/*.mjs` — read-only JSON API (see section above)
- `api/mcp.mjs`, `mcp/stdio.mjs` + `lib/mcp/*.mjs`, `lib/csv.mjs`, `lib/markdown.mjs` — MCP server (see section above)
- `index.html` — app shell (layout, modals, sidebar, header). Pillar-dependent chrome (stats bar, pillar pills, progress rows, print checkboxes) is generated by `renderPillarChrome()` in `js/app.js`, not hard-coded.
- `js/app.js` — core logic: data loading from manifest, filters (pillar / focus area / roadmap / search), scoring, rendering, radar chart (SVG, 6 pillar axes), session management (localStorage + cookies), CSV import/export, guidance / focus-area / About modals
- App icons (repo root, generated from two master images that `.vercelignore` keeps out of deployments). Favicons come from `small_icon.png`, a 24×24 pixel-art design drawn in ~60 px cells (art spans x 177–1614, y 481–1918): sample each cell center to get the native 24×24, then nearest-neighbor to `favicon-16.png`, `favicon-32.png` and the 16/32/48 frames of `favicon.ico` (transparent; smooth filters lose the eye at 16 px). Everything else comes from `new_icon.png`: `apple-touch-icon.png` (180, opaque on `#070c1a` because iOS fills transparency with black), `icon-192.png` / `icon-512.png` (transparent) and `icon-maskable-512.png` (tile at 80 % on `#070c1a`, inside the maskable safe zone), referenced from `site.webmanifest`. Crop the master to the tile (alpha ≥ 200, drops the shadow), center it on a square canvas, resize with Lanczos; the 180/192/512 files are palette-quantized to 256 colors to keep them under 100 KB.
- `js/print.js` — print preview modal rendering
- `css/fonts.css` + `fonts/` — self-hosted Inter and JetBrains Mono (variable woff2, latin + latin-ext, `font-weight: 400 800`, OFL licenses included). Use `var(--font-sans)` / `var(--font-mono)` and only weights 400 / 600 / 800; no Google Fonts requests.
- `css/styles.css` — main styles (pillar colors `--r1..--r6`, `--header-h` for the sticky header height, Lens component styles at the end); `css/responsive.css` — mobile breakpoints (≤ 1100 score strip, ≤ 1024 drawer mode, ≤ 480 phones in portrait: stacked card header, compact strip and pillar stats, content modals as bottom sheets, stacked maturity table; a phones-in-landscape block; a `pointer: coarse` block with larger tap targets and 16px form fields so iOS does not zoom in). Rules that touch the print preview document are scoped to `screen`; `css/print.css` — print media styles
- Internal CSS/DOM names from the previous version are kept for the generic parts (`phase-stats`, `phase-pill`, `phase-tag-N`, `cap-nav-item`, `cap-group-header`, `solution-modal-*`); "phase" now means pillar and "cap" means focus area.
- `syncModalScrollLock()` toggles `modal-open` on `<html>`/`<body>` (CSS `overflow: hidden`) whenever one of the content modals (`CONTENT_MODAL_IDS`) is open, so the page behind does not scroll.
- `renderCards()` shows a FILTERED tag plus a `Reset filters` button (`resetFilters()`, id `resetFiltersBtn`) whenever a pillar, focus-area, roadmap or search filter is active.
- Accordion behaviour: `toggleDetail()` closes any other open card; the sidebar keeps at most one pillar group expanded (`expandedPillar`, all collapsed by default; selecting a focus area expands its group). Header clicks call `applyNavAccordion()` to toggle classes in place so the CSS `grid-template-rows` transition animates; `renderFaNav()` is only the fallback. The card detail (`.rec-detail` > `.rec-detail-body`) opens with the same 0fr → 1fr technique, so it has no height cap (a fixed `max-height` used to cut long details on phones).
- Drawer mode (≤ 1024px): the sidebar is moved to `<body>` and becomes an overlay; its injected actions end with Reset All (destructive last), and `sidebar-open` is mirrored on `<html>` so the page behind does not scroll.
- Card text size: `adjustCardFontScale()` sets `--card-scale` (bounded by `CARD_FONT_MIN`/`CARD_FONT_MAX`, step `CARD_FONT_STEP`, persisted under `aal_card_font_scale`); card typography rules at the end of `css/styles.css` use `calc(Npx * var(--card-scale))`, and so does the Implementation guidance modal body (`#guidanceModal .solution-modal-body`). `highlightFontControls()` pulses the control (`.font-controls.highlight`) for a few seconds after load. The control is desktop-only: `css/responsive.css` hides it in drawer mode (≤ 1024px) and pins `--card-scale` to 1 there (`!important` beats the inline value), because the mobile card typography is fixed.
- The right panel has three sections (overall score `#panelOverall`, pillar progress, radar `#panelRadar`); the mobile layout reparents the two sections by id.
- Scores are coverage percentages over all applicable best practices: unassessed items count as 0%, items excluded (`'na'`) are left out of the denominator (`coveragePct()` in `js/app.js`, same rule in the print summary).

## Data Model

- `data/manifest.json` — `{ "lens", "focus_areas", "items": [150 paths in pillar order], "total": 150 }`
- `data/lens/lens.json` — lens metadata: abstract, design principles, pillars (intro, pillar design principles, focus-area ids), roadmap reading paths, definitions, counts, publication date
- `data/lens/focus_areas.json` — 41 records: `id`, `pillar`, `name`, `question` (from the focus-area page), `appendix_question` (Appendix A wording, used by the update checker), `intro`, `capability_intent[]`, `maturity_levels[]` (5 rows), `common_issues[]`, `best_practices[]`, `roadmap[]`, `doc_url`
- `data/<pillar-slug>/<bp-id>.json` — one item per best practice (pillar slugs: `operational-excellence`, `security`, `reliability`, `performance-efficiency`, `cost-optimization`, `sustainability`)
- `guidance/<pillar-slug>/<bp-id>.md` — condensed implementation guidance (1:1 with the item files). The "Implementation guidance" modal fetches the file (falling back to `/api/best-practices/{id}/guidance?format=json`) and renders only its `### Implementation steps` section via `extractMarkdownSection()`; the full file is available through the API

Item schema:
```json
{
  "id": "AGENTOPS01-BP01",
  "pillar": "Operational excellence",
  "focus_area_id": "AGENTOPS01",
  "focus_area": "Operational practices for agentic AI systems",
  "recommendation": "Establish well-defined agent roles, responsibilities, and success criteria",
  "risk": "High",
  "aws_service": "Amazon Bedrock Guardrails / AWS Agent Registry",
  "guidance": "Short summary ...",
  "how_to_check": "• Desired outcome ...\n\nFor more information, see the <a href='...'>AGENTOPS01-BP01 documentation</a>.",
  "doc_url": "https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html"
}
```

`pillar` must match an entry of `PILLARS`; `focus_area_id` must exist in `focus_areas.json`; `how_to_check` is rendered with `white-space: pre-wrap` and ends with the documentation link that CI checks. Item files must stay under 2500 characters.

## Key Constants (js/app.js)

- `PILLARS` / `PILLAR_SHORT` / `PILLAR_ABBR` / `PILLAR_PREFIX` / `PILLAR_COLORS` — the 6 pillars in Lens order (colors mirror CSS `--r1..--r6`)
- `RISK_COLORS` — High / Medium / Low badge colors
- `FOCUS_AREAS`, `FA_BY_ID`, `LENS` — loaded at runtime from `data/lens/*.json`
- `SCORING_OPTIONS` — 6-point scale (0%, 25%, 50%, 75%, 100%, Excluded)
- Session state persisted in localStorage under keys `aal_sessions_v1` / `aal_current_session_v1`
- Current session ID also stored in browser cookie `aal_session_id` for persistence across browser sessions

## Session Management

The application uses a dual-storage approach for session persistence:
- **localStorage**: Stores all session data (scores keyed by best-practice id, comments, metadata)
- **Cookies**: Stores the current session ID (`aal_session_id`) with 365-day expiration
- Cookie storage provides persistence across browser restarts while localStorage serves as fallback
- No authentication required — application loads directly and is fully accessible
- Sessions are renamed from the dropdown: every row has a pencil (`openRenameSessionModal()` → `#renameSessionModal`, `confirmRenameSession()`) to the left of its delete X. Only the name changes (scores, comments, date and `isDefault` are kept); the default session can be renamed but not deleted; CSV file names and printed reports use the current name
- CSV export (`buildCsvRows()` + `csvText()` in `js/app.js`) writes all 150 practices in Lens order with the columns `ID`, `Pillar`, `Focus Area ID`, `Focus Area`, `Best Practice`, `Risk`, `Roadmap` (ids joined with `; `), `AWS Services`, `Status` (`Assessed` / `Unassessed` / `Excluded`), `Alignment` (label without the percentage, ASCII only), `Score` (`75%`, `N/A`, empty when unassessed), `Comments`, `Doc URL`; every field quoted, LF line endings, UTF-8 BOM, `text/csv;charset=utf-8`. The file name stays `<session>-<YYYY-MM-DD>.csv` because the importer derives the session name and date from it; `csvFilename()` folds diacritics and turns any run of other characters into one hyphen (`Revisión Q4 / 2026` → `revision-q4-2026-…`), identically in `js/app.js` and `lib/csv.mjs`
- CSV import (`parseCSVRows()`, a quote-aware RFC 4180 parser that tolerates BOM, CRLF and line breaks inside quoted comments) reads only `ID`, `Score`, `Comments` and the optional `Status` column (`Excluded` marks an item excluded even without a score), so exports from any version of the tool can be imported. `lib/mcp/scoring.mjs` keeps a copy of the parser (`parseCsvRows()`) and `lib/csv.mjs` a copy of the export; `tools/csv_sync_test.mjs` enforces that they stay identical

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->
