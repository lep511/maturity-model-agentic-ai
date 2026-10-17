# AWS Well-Architected Agentic AI Lens — Self-Assessment

A static web app for self-assessing an agentic AI workload against the **AWS Well-Architected Agentic AI Lens**: 150 best practices organized into 41 focus areas across the 6 Well-Architected pillars. Score each best practice, review the official maturity levels for every focus area, follow the Lens roadmap reading paths, and track progress per pillar with a radar chart, CSV export and printable reports.

> **Unofficial study aid.** The content in `data/` and `guidance/` is condensed from the
> [AWS Well-Architected Framework – Agentic AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html)
> (AWS documentation, published June 10, 2026). Every item links back to its official page; always refer to the
> AWS documentation for the authoritative text. This project is not affiliated with or endorsed by AWS.
> To run a formal review, import the official custom lens into the AWS Well-Architected Tool from the
> [custom lens repository](https://github.com/aws-samples/sample-well-architected-custom-lens/blob/main/agentic-ai-lens/agentic-ai-lens.json).

## What you get

| Lens structure | In the app |
| --- | --- |
| 6 pillars (Operational excellence, Security, Reliability, Performance efficiency, Cost optimization, Sustainability) | Top stats bar, pillar filter pills, pillar progress bars, radar axes |
| 41 focus areas (`AGENTOPS01` ... `AGENTSUS03`), each with a guiding question, capability intent, 5 maturity levels and common issues | Sidebar navigation grouped by pillar, card group headers, **Maturity levels** modal |
| 150 best practices with a High / Medium / Low risk level | One card each: summary, desired outcome, risk badge, related AWS services, **Implementation guidance** modal (shows the implementation steps), link to the official page |
| Lens roadmap reading paths (Building your first agent, Moving to production, Scaling to multi-agent systems, Hardening an existing deployment) | Roadmap filter pills and tags on cards |
| Design principles, definitions, pillar introductions | **About the Lens** modal |

Scoring uses a 6-point coverage scale per best practice: 0%, 25%, 50%, 75%, 100% or *Excluded from analysis*.

## Read-only API

The same content is exposed as a read-only JSON API implemented as a Vercel Function (`api/index.mjs`, routed by `lib/api/router.mjs`; the response shapes in `lib/api/shapes.mjs` are shared with the MCP server below). All endpoints are `GET`, public, CORS-enabled (`Access-Control-Allow-Origin: *`) and cached at the CDN per deployment. An OpenAPI 3.1 description is served at `/api/openapi.json`.

| Endpoint | Description |
| --- | --- |
| `GET /api` | Index: lens metadata, counts, endpoint list |
| `GET /api/lens` | Abstract, design principles, pillars, roadmap, definitions |
| `GET /api/pillars`, `GET /api/pillars/{slug}` | Pillars with counts; detail adds design principles and focus areas (`slug`, name, prefix or abbreviation such as `SEC`) |
| `GET /api/focus-areas`, `GET /api/focus-areas/{id}` | Focus areas (`?pillar=`, `?roadmap=`, `?expand=1`); detail adds capability intent, 5 maturity levels, common issues and the best practices |
| `GET /api/best-practices` | Best practices with `?pillar=`, `?focus_area=`, `?risk=High,Medium`, `?roadmap=first-agent`, `?q=`, `?fields=`, `?limit=`, `?offset=` |
| `GET /api/best-practices/{id}` | One best practice (`?include=guidance` embeds the guidance markdown); ids accept `AGENTOPS01-BP01` or `AGENTOPS01_BP01` |
| `GET /api/best-practices/{id}/guidance` | Condensed implementation guidance as `text/markdown` (`?format=json` for JSON) |
| `GET /api/roadmap`, `GET /api/roadmap/{id}` | Lens roadmap reading paths (`first-agent`, `production`, `multi-agent`, `hardening`) |
| `GET /api/definitions?q=` | Glossary terms |

Add `?pretty=1` to any endpoint for indented JSON. Errors are JSON: `{"error": {"code": "...", "message": "..."}}` with 400, 404, 405 or 500.

```bash
curl -s https://agentic-ai-lens-assessment.vercel.app/api/best-practices?pillar=security&risk=High&fields=id,title
curl -s https://agentic-ai-lens-assessment.vercel.app/api/focus-areas/AGENTSEC03?pretty=1
curl -s https://agentic-ai-lens-assessment.vercel.app/api/best-practices/AGENTOPS01-BP01/guidance
```

The function reads the generated `data/` and `guidance/` files at runtime (`includeFiles` in `vercel.json` bundles them) and caches them in memory per instance. `node tools/api_smoke_test.mjs` runs the router in-process against the repository content; CI runs it on every change.

## MCP server

The Lens is also available to AI assistants through a [Model Context Protocol](https://modelcontextprotocol.io) server built with the official TypeScript SDK v2 (`@modelcontextprotocol/server`), implementing the current protocol revision **2026-07-28**. The same code (`lib/mcp/server.mjs`) runs two ways:

| Transport | Where | Notes |
| --- | --- | --- |
| Streamable HTTP | `https://agentic-ai-lens-assessment.vercel.app/mcp` | Vercel Function `api/mcp.mjs`; stateless, public, no authentication, CORS enabled |
| stdio | `node mcp/stdio.mjs` (or `npm run mcp`) after `npm ci` | For local clients; logs go to stderr |

The server exposes **10 read-only tools**, **5 resources** under the `lens://` scheme and **3 prompts**. Answers derive from the REST API shapes but are trimmed for a model's context: listings are compact (id, title, risk, focus area) unless `detail: true` or `fields` ask for more, hypermedia links are dropped, every record keeps its `doc_url`, and the tool descriptions state approximate sizes.

| Tool | What it returns |
| --- | --- |
| `list_pillars`, `get_pillar` | The six pillars with counts and focus-area ids; detail adds the intro, design principles and focus-area questions (slug, name, prefix or abbreviation such as `SEC`) |
| `list_focus_areas`, `get_focus_area` | Focus areas filtered by pillar or roadmap; detail adds capability intent, the 5 maturity levels, common issues and the best practices (id, title, risk, summary) |
| `search_best_practices` | Full-text search and filters (`pillar`, `focus_area`, `risk`, `roadmap`); compact listing by default with `limit` 50, so a whole pillar fits in one call; `detail: true` or `fields` for full records; paginated |
| `get_best_practice` | One best practice (optionally with the guidance markdown embedded) |
| `get_implementation_guidance` | The *Implementation steps* section (default) or the full condensed guidance as markdown |
| `get_roadmap` | The Lens reading paths, one of them with its best practices (id, title, risk, summary) |
| `lookup_definition` | Glossary terms |
| `score_assessment` | Coverage per pillar and focus area plus the gap list, computed from the CSV exported by this app (columns `ID`, `Score`, `Comments`) or from a `{id, score}` list, with the app's rule (unassessed = 0 %, excluded items leave the denominator) |

Resources: `lens://lens`, `lens://pillars/{slug}`, `lens://focus-areas/{id}`, `lens://best-practices/{id}` (JSON) and `lens://best-practices/{id}/guidance` (markdown), all listable and with id completion. Prompts: `review_focus_area` (guided interview that ends with an importable CSV), `gap_report` (prioritized remediation report from an export) and `explain_best_practice`.

Connect a client:

```bash
# Claude Code, remote server
claude mcp add --transport http agentic-ai-lens https://agentic-ai-lens-assessment.vercel.app/mcp

# Claude Code, local stdio server (run npm ci in the repository first)
claude mcp add agentic-ai-lens -- node /path/to/maturity-model-agentic-ai/mcp/stdio.mjs
```

Clients configured with JSON use `{"mcpServers": {"agentic-ai-lens": {"url": "https://agentic-ai-lens-assessment.vercel.app/mcp"}}}`. From the Claude API, pass the URL in `mcp_servers` (`type: "url"`) and add an `mcp_toolset` entry in `tools` (beta `mcp-client-2025-11-20`).

Streamable HTTP in revision 2026-07-28 is POST-only, has no sessions, and mirrors the JSON-RPC body into headers: every request carries `MCP-Protocol-Version` and `Mcp-Method`, and `tools/call`, `resources/read` and `prompts/get` also carry `Mcp-Name`. Clients that still start with the legacy `initialize` handshake (revision 2025-11-25 and earlier) are served as well. A raw request:

```bash
curl -s https://agentic-ai-lens-assessment.vercel.app/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' -H 'Mcp-Method: server/discover' \
  -d '{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"curl","version":"0"},"io.modelcontextprotocol/clientCapabilities":{}}}}'
```

`node tools/mcp_smoke_test.mjs` exercises the server through an in-process client, the real stdio entry point and raw JSON-RPC against the HTTP function (modern and legacy paths); CI runs it after `npm ci`.

## Project structure

```
.
├── index.html                 # App shell (layout, modals, sidebar, header)
├── vercel.json                # Vercel config: static headers, /mcp and /api/* rewrites, function includeFiles
├── package.json               # MCP server dependencies (@modelcontextprotocol/server, zod) and test scripts
├── api/
│   ├── index.mjs              # Vercel Function: read-only JSON API
│   └── mcp.mjs                # Vercel Function: MCP server over Streamable HTTP (stateless)
├── mcp/
│   └── stdio.mjs              # Local MCP server over stdio
├── lib/
│   ├── api/
│   │   ├── data.mjs           # Loads and indexes data/ + guidance/ (cached per instance)
│   │   ├── shapes.mjs         # Lookups, filters and response shapes shared by the API and the MCP server
│   │   ├── router.mjs         # Routes /api/* by pathname
│   │   └── openapi.mjs        # OpenAPI 3.1 document builder
│   ├── mcp/
│   │   ├── server.mjs         # buildServer(): MCP tools, resources and prompts
│   │   └── scoring.mjs        # Assessment scoring from the exported CSV (same rule as the app)
│   └── markdown.mjs           # extractMarkdownSection() (kept identical to js/app.js)
├── css/
│   ├── fonts.css              # @font-face for the self-hosted Inter + JetBrains Mono variable fonts
│   ├── styles.css             # Main styles (pillar colors --r1..--r6, Lens components)
│   ├── responsive.css         # Mobile breakpoints
│   └── print.css              # Print media styles
├── fonts/                     # Inter + JetBrains Mono (variable woff2, latin + latin-ext) and their OFL licenses
├── js/
│   ├── app.js                 # Core logic: data loading, filters, scoring, radar, sessions, CSV, modals
│   └── print.js               # Print preview modal
├── data/
│   ├── manifest.json          # Index of all generated files (lens, focus_areas, items, total)
│   ├── lens/
│   │   ├── lens.json          # Lens metadata: abstract, design principles, pillars, roadmap, definitions
│   │   └── focus_areas.json   # 41 focus areas: question, capability intent, maturity levels, common issues
│   ├── operational-excellence/ agentops01-bp01.json ...   (26 items)
│   ├── security/               agentsec01-bp01.json ...   (30 items)
│   ├── reliability/            agentrel01-bp01.json ...   (33 items)
│   ├── performance-efficiency/ agentperf01-bp01.json ...  (24 items)
│   ├── cost-optimization/      agentcost01-bp01.json ...  (24 items)
│   ├── sustainability/         agentsus01-bp01.json ...   (13 items)
│   ├── count_chars.sh         # CI: fail if any item JSON exceeds 2500 characters
│   ├── extract_link.sh        # CI: extract Lens documentation links from data/ and guidance/
│   ├── check_link_action.sh   # CI: verify extracted links respond with 2xx/3xx
│   └── ToolsInfo.md           # Script documentation
├── guidance/<pillar>/<bp-id>.md   # 150 condensed implementation guidance pages (the app shows their Implementation steps section)
└── tools/
    ├── build_lens_content.py  # Generates data/ and guidance/ from the AWS docs (stdlib only)
    ├── validate_content.py    # Offline consistency checks (used by CI)
    ├── check_lens_updates.py  # Detects new or changed entries in the published Lens (runs on every push)
    ├── api_smoke_test.mjs     # In-process tests for the read-only API (used by CI)
    └── mcp_smoke_test.mjs     # Tests for the MCP server: in-process client, stdio and the HTTP function (used by CI)
```

### Item schema

Each file in `data/<pillar-slug>/` describes one best practice:

```json
{
  "id": "AGENTOPS01-BP01",
  "pillar": "Operational excellence",
  "focus_area_id": "AGENTOPS01",
  "focus_area": "Operational practices for agentic AI systems",
  "recommendation": "Establish well-defined agent roles, responsibilities, and success criteria",
  "risk": "High",
  "aws_service": "Amazon Bedrock Guardrails / AWS Agent Registry / Amazon Bedrock AgentCore / Amazon CloudWatch",
  "guidance": "Short summary of the best practice ...",
  "how_to_check": "• Desired outcome 1\n• Desired outcome 2\n\nFor more information, see the <a href='...'>AGENTOPS01-BP01 documentation</a>.",
  "doc_url": "https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html"
}
```

`pillar` must be one of the six names in `PILLARS` (`js/app.js`), `focus_area_id` must exist in `data/lens/focus_areas.json`, and each item must have a matching `guidance/<pillar-slug>/<bp-id>.md` file. Item files must stay under 2500 characters to pass CI.

## Regenerating the content

`data/` and `guidance/` are **generated**: do not hand-edit them. The generator fetches the markdown rendering of every Lens page (the docs serve each page as `<slug>.md`), parses it, and writes the item JSON, the focus-area and lens metadata, the manifest and the condensed guidance files. Raw pages are cached under `.cache/lens-docs/` (gitignored).

```bash
# Fetch (or reuse the cache), parse and write everything; ~200 requests on a cold run
python3 -I tools/build_lens_content.py            # options: --refresh --full --clean --sleep 0.5 --allow-count-drift

# Offline consistency checks (also run by CI)
python3 -I tools/validate_content.py
```

The generator asserts the counts of the known release (6 pillars, 41 questions, 150 best practices, 90 High / 59 Medium / 1 Low). When AWS publishes a revision, run with `--refresh --clean --allow-count-drift`, review the warnings, and update the counts in the script and in `tools/validate_content.py`.

## Checking for new entries in the Lens

AWS revises the Lens over time (the generated content records the publication date it was built from). `tools/check_lens_updates.py` compares the **currently published** documentation with the repository and reports anything new, removed or changed, so you know when to regenerate.

```bash
# Light check (3 small requests): pillars, focus-area questions, best practices, risk levels, publication date
python3 -I tools/check_lens_updates.py

# Deep check: regenerate everything into a temp dir and diff it against data/ and guidance/
# (catches wording changes inside existing pages; ~200 requests with --refresh)
python3 -I tools/check_lens_updates.py --deep --refresh

# Machine-readable report
python3 -I tools/check_lens_updates.py --json
```

| Exit code | Meaning |
| --- | --- |
| `0` | No new entries: the repository matches the published Lens |
| `1` | Updates detected (new or removed pillars, focus areas or best practices; changed titles, risk levels or questions; new publication date; or, with `--deep`, changed files) |
| `2` | The check could not run (network or parse error). Never treated as "no changes" |

Example output when the repository is current:

```
Upstream publication date: June 10, 2026
Upstream: 6 pillars, 41 focus areas, 150 best practices

No new entries: the repository matches the published Lens.
```

When updates are reported, regenerate and validate:

```bash
python3 -I tools/build_lens_content.py --refresh --clean --allow-count-drift
python3 -I tools/validate_content.py
```

and, if the counts changed, update `EXPECTED` in `tools/build_lens_content.py` and `tools/validate_content.py`.

**Automated check.** `.github/workflows/check-lens-updates.yml` runs the light check on every push to the repository (and on demand from the Actions tab, optionally in deep mode). When updates are detected the run fails, uploads `lens-updates.json` as an artifact and opens an issue labelled `lens-update` (or comments on the open one) with the list of changes and the regeneration commands.

## Typography

The UI uses **Inter** (text) and **JetBrains Mono** (codes and labels), self-hosted from `fonts/` as variable woff2 files (latin and latin-ext subsets, weight axis 400 to 800) declared in `css/fonts.css`. The app makes no request to Google Fonts. The CSS only uses weights 400, 600 and 800 through the `--font-sans` / `--font-mono` custom properties. Both families are licensed under the SIL Open Font License; the license texts ship next to the files. To update a font, download the new woff2 subsets and replace the files, keeping the names referenced in `css/fonts.css`.

## Run locally

A local HTTP server is required: opening `index.html` directly via `file://` blocks the JSON fetches.

```bash
npx serve .
# or
python3 -m http.server 3000
```

The app and the REST API have no dependencies. The MCP server and the test scripts need Node 24 and `npm ci`:

```bash
npm ci
npm run mcp        # MCP server over stdio
npm test           # API and MCP smoke tests
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Vercel installs the dependencies in `package.json` for the MCP function; there is no build step. Production: https://agentic-ai-lens-assessment.vercel.app (API at `/api`, MCP at `/mcp`).

## CI

`.github/workflows/check-links.yml` runs on every push or pull request that touches `data/`, `guidance/`, `tools/`, `api/`, `lib/`, `mcp/`, `vercel.json`, `package.json` or `package-lock.json`:

1. `tools/validate_content.py` — manifest, schema, counts, risk values, guidance files
2. `npm ci` (Node 24), then `tools/api_smoke_test.mjs` — the read-only API routed in-process against the repository content
3. `tools/mcp_smoke_test.mjs` — the MCP server through an in-process client, the stdio entry point and the HTTP function
4. `data/count_chars.sh data` — fails if any item JSON exceeds 2500 characters (the `data/lens/` metadata files are skipped)
5. `data/extract_link.sh .` — collects every unique `https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/...` link
6. `data/check_link_action.sh` — fails on any 4xx/5xx response

A second workflow, `check-lens-updates.yml`, runs on every push to detect new entries in the published Lens (see above).

See [`data/ToolsInfo.md`](data/ToolsInfo.md) for script options.

## Features

* 150 best practices scored on a 6-point coverage scale (0%, 25%, 50%, 75%, 100%, Excluded)
* Filters by pillar, focus area, Lens roadmap reading path, unassessed and excluded items, plus full-text search
* Official 5-level maturity table, capability intent and common issues for every focus area
* **Implementation guidance** modal with the official implementation steps of each practice; the full condensed guidance (desired outcome, anti-patterns, benefits, steps, resources) is kept in `guidance/` and served by the API
* Overall score, pillar progress and a 6-axis radar chart, all computed as coverage over every applicable best practice (unassessed items count as 0%, excluded items are left out)
* Multi-session management persisted in the browser (localStorage + cookie)
* CSV export / import (imports read the `ID`, `Score` and `Comments` columns)
* Print preview with cards or table layout, color or black & white, risk and AWS services columns
* Accordion cards and sidebar (one open card and one expanded pillar group at a time, animated), and A- / A+ controls to resize the card text and the Implementation guidance modal between 80% and 140% (remembered in the browser)
* Responsive layout for tablets and phones
* Read-only JSON API (`/api`, OpenAPI at `/api/openapi.json`) over the same content
* MCP server (revision 2026-07-28) at `/mcp` and over stdio: tools, `lens://` resources and prompts, including assessment scoring from the exported CSV

## License

The application code is released under the license in [`LICENSE`](LICENSE). The Lens content remains the property of Amazon Web Services, Inc. or its affiliates and is reproduced here in condensed form, with attribution and links, for educational self-assessment purposes.
