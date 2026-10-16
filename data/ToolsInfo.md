# Content and link checks — Agentic AI Lens Self-Assessment

Scripts that keep the generated content consistent and make sure every link into the
AWS Well-Architected Agentic AI Lens documentation still resolves. All of them run in
`.github/workflows/check-links.yml`; they can also be run locally from the repository root.

## Requirements

| Tool | Used by |
| --- | --- |
| `python3` (3.9+, standard library only) | `tools/build_lens_content.py`, `tools/validate_content.py` |
| `node` (18+) | `tools/api_smoke_test.mjs` |
| `bash`, `grep`, `sed`, `find`, `realpath` | `data/count_chars.sh`, `data/extract_link.sh` |
| `curl` | `data/check_link_action.sh` |

## 1. `tools/build_lens_content.py` — regenerate the content

Fetches the markdown rendering of every Lens page (`https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/<slug>.md`), parses it and writes `data/`, `data/lens/`, `data/manifest.json` and `guidance/`.

```bash
python3 -I tools/build_lens_content.py [--sleep 0.5] [--refresh] [--full] [--clean] [--allow-count-drift]
```

| Option | Effect |
| --- | --- |
| `--sleep N` | Seconds between HTTP requests (default 0.5) |
| `--refresh` | Ignore the on-disk cache in `.cache/lens-docs/` and refetch every page |
| `--full` | Emit the complete implementation guidance and every resource group in the guidance files |
| `--clean` | Delete generated files that are no longer produced |
| `--allow-count-drift` | Continue when the pillar / question / best-practice counts differ from the known release |

Parsing problems are reported as warnings and leave the affected field empty; the script never fabricates content.

## 2. `tools/validate_content.py` — offline consistency checks

```bash
python3 -I tools/validate_content.py [--max-chars 2500]
```

Fails (exit code 1) when: a JSON file does not parse; `manifest.json` lists a missing path or a wrong `total`; an item lacks a required field, has a duplicate id or an id that does not match its filename, an unknown pillar or focus area, or an invalid risk level; an item file exceeds the character limit; a focus area has fewer than 5 maturity levels; or an item has no matching `guidance/` file.

## 2a. `tools/check_lens_updates.py` — detect new entries in the published Lens

```bash
python3 -I tools/check_lens_updates.py [--deep] [--refresh] [--json] [--root DIR] [--sleep 0.5]
```

Fetches `appendix-a.md`, `agentic-ai-lens.md` and `document-revisions.md` fresh (bypassing the cache) and compares pillars, focus-area questions, best-practice ids, titles, risk levels and the publication date with the repository. `--deep` regenerates everything into a temporary directory (`build_lens_content.py --out`) and diffs `data/` and `guidance/` file by file. Exit codes: 0 no updates, 1 updates detected, 2 the check could not run. `.github/workflows/check-lens-updates.yml` runs it on every push (and on demand) and opens an issue labelled `lens-update` when it exits 1.

## 2b. `tools/api_smoke_test.mjs` — read-only API test

```bash
node tools/api_smoke_test.mjs
```

Imports `lib/api/router.mjs` and issues requests in-process (no server, no network) against the repository content: index counts, OpenAPI document, pillars, focus areas, best-practice filters and pagination, guidance in markdown and JSON, roadmap, definitions, error codes (400/404/405) and CORS/cache headers. Exit code 1 on any failure. Requires Node.js 18+.

## 3. `data/count_chars.sh` — item size check

```bash
./data/count_chars.sh <directory> [output.json] [--threshold N]
```

Counts the characters of every `*.json` / `*.jsonl` file below the directory (whole file, including whitespace) and fails when any file exceeds the threshold (default **2500**). `manifest.json` and the metadata files under `data/lens/` are skipped because they are legitimately large. Oversized files are listed in `large_files.json` (gitignored).

## 4. `data/extract_link.sh` — collect Lens links

```bash
./data/extract_link.sh <directory> [output.json]
```

Scans `*.json`, `*.jsonl` and `*.md` files (skipping `.git/`, `.cache/` and `node_modules/`), extracts URLs from `href='...'`, markdown links and bare URLs, keeps only those that start with `https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens`, de-duplicates `(file, link)` pairs and writes `links_output.json`:

```json
[
  {"file_name": "data/operational-excellence/agentops01-bp01.json", "link": "https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops01-bp01.html"}
]
```

## 5. `data/check_link_action.sh` — verify the links

```bash
./data/check_link_action.sh [--input links_output.json] [--output links_checked.json] [--timeout 10] [--retries 2] [--parallel 3]
```

Requests every link with `curl`, follows redirects and writes `links_checked.json` with `http_code`, `status`, `final_url` and `response_time_ms` per link.

| Status | Meaning | Fails the workflow? |
| --- | --- | --- |
| `ok` | 2xx | No |
| `redirect` | 3xx (after following up to 5 redirects) | No |
| `client_error` / `server_error` | 4xx / 5xx | **Yes** |
| `unreachable` | No HTTP response (timeout, DNS) | No |

## GitHub Actions

The workflow triggers on pushes and pull requests that modify `data/**`, `guidance/**`, `tools/**`, `api/**`, `lib/**`, `vercel.json` or the workflow file itself, runs the validator, the API smoke test (Node 24), the size check, the link extraction and the link check, and uploads `links_checked.json` (always) and `large_files.json` (only when oversized files are found) as artifacts.
